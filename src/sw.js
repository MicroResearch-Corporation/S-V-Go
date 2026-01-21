import { precacheAndRoute } from "workbox-precaching/precacheAndRoute";
precacheAndRoute([
  { revision: "d27dcc7eb10937dc11fb3dd2d462307c", url: "index.html" },
  { revision: "d41d8cd98f00b204e9800998ecf8427e", url: "src/app.js" },
  { revision: "d41d8cd98f00b204e9800998ecf8427e", url: "src/style.css" },
]);
