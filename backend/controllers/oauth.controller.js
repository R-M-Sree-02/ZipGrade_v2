const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// ================= GOOGLE =================

const googleRedirect = (req, res) => {
     const params = new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID,
          redirect_uri: process.env.GOOGLE_CALLBACK_URL,
          response_type: 'code',
          scope: 'email profile',
          prompt: 'consent',
          state: uuidv4()
     });

     res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
};

const googleCallback = async (req, res) => {
     try {
          const db = req.app.locals.db;
          const { code } = req.query;

          const tokenRes = await axios.post(
               'https://oauth2.googleapis.com/token',
               {
                    code,
                    client_id: process.env.GOOGLE_CLIENT_ID,
                    client_secret: process.env.GOOGLE_CLIENT_SECRET,
                    redirect_uri: process.env.GOOGLE_CALLBACK_URL,
                    grant_type: 'authorization_code'
               }
          );

          const { access_token } = tokenRes.data;

          const userInfo = await axios.get(
               'https://www.googleapis.com/oauth2/v2/userinfo',
               { headers: { Authorization: `Bearer ${access_token}` } }
          );

          const { id, email, name } = userInfo.data;

          let user = await db.getUserByEmail(email);

          if (!user) {
               const userId = await db.createUser({
                    user_name: name || email.split('@')[0],
                    email_id: email,
                    hashedPassword: null,
                    auth_provider: 'google',
                    provider_id: id
               });
               user = await db.getUserById(userId);
          }

          const { accessToken } = await issueTokensAndSession(db, user, req);

          return res.send(`
      <script>
        window.opener.postMessage({ token: "${accessToken}" }, "${process.env.FRONTEND_URL}");
        window.close();
      </script>
    `);
     } catch (err) {
          return res.send(`
      <script>
        window.opener.postMessage({ error: "oauth_failed" }, "${process.env.FRONTEND_URL}");
        window.close();
      </script>
    `);
     }
};

// ================= ZOHO =================

const zohoRedirect = (req, res) => {
     const params = new URLSearchParams({
          client_id: process.env.ZOHO_CLIENT_ID,
          redirect_uri: process.env.ZOHO_REDIRECT_URI,
          scope: 'AaaServer.profile.Read',
          response_type: 'code',
          prompt: 'consent',
          state: uuidv4()
     });

     res.redirect(`https://accounts.zoho.com/oauth/v2/auth?${params}`);
};

const zohoCallback = async (req, res) => {
     try {
          const db = req.app.locals.db;
          const { code } = req.query;

          const tokenRes = await axios.post(
               'https://accounts.zoho.com/oauth/v2/token',
               null,
               {
                    params: {
                         code,
                         client_id: process.env.ZOHO_CLIENT_ID,
                         client_secret: process.env.ZOHO_CLIENT_SECRET,
                         redirect_uri: process.env.ZOHO_REDIRECT_URI,
                         grant_type: 'authorization_code'
                    }
               }
          );

          const { access_token } = tokenRes.data;

          const userInfo = await axios.get(
               'https://accounts.zoho.com/oauth/v2/userinfo',
               { headers: { Authorization: `Bearer ${access_token}` } }
          );

          const { sub, email, name } = userInfo.data;

          let user = await db.getUserByEmail(email);

          if (!user) {
               const userId = await db.createUser({
                    user_name: name || email.split('@')[0],
                    email_id: email,
                    hashedPassword: null,
                    auth_provider: 'zoho',
                    provider_id: sub
               });
               user = await db.getUserById(userId);
          }

          const { accessToken } = await issueTokensAndSession(db, user, req);

          return res.send(`
      <script>
        window.opener.postMessage({ token: "${accessToken}" }, "${process.env.FRONTEND_URL}");
        window.close();
      </script>
    `);
     } catch (err) {
          return res.send(`
      <script>
        window.opener.postMessage({ error: "oauth_failed" }, "${process.env.FRONTEND_URL}");
        window.close();
      </script>
    `);
     }
};

module.exports = {
     googleRedirect,
     googleCallback,
     zohoRedirect,
     zohoCallback
};