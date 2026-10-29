/*
 * NUV® — Firebase web app config (optional live layer).
 *
 * Leave every value empty and the site keeps working exactly as before:
 * localStorage edits -> data/projects.json -> built-in defaults.
 *
 * To go live (free Spark plan):
 *   1. Firebase console -> Add project -> Register a *Web* app.
 *   2. Copy the config object it gives you into the values below and commit.
 *   3. Firestore -> add a collection named "projects" (or just save once from
 *      admin.html) and publish these rules for public read / admin write:
 *
 *      rules_version = '2';
 *      service cloud.firestore {
 *        match /databases/{database}/documents {
 *          match /projects/{projectId} {
 *            allow read: if true;
 *            allow write: if true;  // demo lock — add Firebase Auth to restrict
 *          }
 *        }
 *      }
 */
window.NUVFirebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};
