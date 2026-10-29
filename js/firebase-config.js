/* NUV — Firebase configuration
   ---------------------------------------------------------------------------
   This is the only file you need to edit to point the site at your Firebase
   project. It is loaded before js/projects.js on both index.html and admin.html.

   The values below are a web-app config: they are public by design (Firebase
   ships them in every page load), so committing them is safe — they only grant
   access that your Firestore security rules allow.

   Paste the object Firebase gives you when you register a web app:

       const firebaseConfig = {
         apiKey: "...",
         authDomain: "...",
         projectId: "...",
         storageBucket: "...",
         messagingSenderId: "...",
         appId: "...",
         measurementId: "..."
       };

   With every value empty (or this file missing) the site runs exactly as it
   did before Firebase: localStorage first, then data/projects.json, then the
   built-in defaults.
*/
(function () {
  "use strict";

  window.NUVFirebaseConfig = {
    apiKey: "AIzaSyDngxAVoRFI24N5uNwmdEDzNo4h9uyseV0",
    authDomain: "project-5676362499443489605.firebaseapp.com",
    projectId: "project-5676362499443489605",
    storageBucket: "project-5676362499443489605.firebasestorage.app",
    messagingSenderId: "572680007830",
    appId: "1:572680007830:web:0124ee6c3e9d37997a12b7",
    measurementId: "G-K194B5WQX1"
  };
}());
