import { onRequest } from "firebase-functions/v2/https";

export const helloWorld = onRequest((req, res) => {
  res.json({ status: "ok", message: "OpenPlate Cloud Functions running" });
});
