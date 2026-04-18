import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {defineString} from "firebase-functions/params";
import * as admin from "firebase-admin";
import {buildFoodPrompt, buildQuickRecordPrompt} from "./prompts";
import {callQwenVision} from "./qwen";
import type {AiTaskType, LLMFoodResult} from "./types";

admin.initializeApp();

const qwenApiKey = defineString("QWEN_API_KEY");

interface AiTaskDoc {
  type: AiTaskType;
  status: string;
  photoStoragePath: string;
  description?: string;
  userId: string;
  targetDate: string;
  fcmToken?: string;
  createdAt: admin.firestore.Timestamp;
}

export const processAiTask = onDocumentCreated(
  {
    document: "aiTasks/{taskId}",
    timeoutSeconds: 120,
    memory: "512MiB",
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const taskId = event.params.taskId;
    const task = snapshot.data() as AiTaskDoc;
    const db = admin.firestore();
    const taskRef = db.doc(`aiTasks/${taskId}`);

    try {
      // Download photo from Storage → base64
      const bucket = admin.storage().bucket();
      const file = bucket.file(task.photoStoragePath);
      const [buffer] = await file.download();
      const base64 = `data:image/jpeg;base64,${buffer.toString("base64")}`;

      // Build prompt and call LLM
      const prompt = task.type === "food"
        ? buildFoodPrompt(task.description)
        : buildQuickRecordPrompt(task.description);

      const result: LLMFoodResult = await callQwenVision(
        qwenApiKey.value(),
        base64,
        prompt,
      );

      // Write result back to Firestore
      await taskRef.update({
        status: "ready",
        result: {
          name: result.name,
          isCompleteProtein: result.isCompleteProtein,
          nutrients: result.nutrients,
        },
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Record LLM usage
      const usageRef = db.collection("llmUsage").doc();
      await usageRef.set({
        userId: task.userId,
        type: task.type,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Send FCM push notification
      if (task.fcmToken) {
        const title = "OpenPlate";
        const body = task.type === "food"
          ? "AI食物识别完成，请前往食物库验证"
          : "AI快速记录识别完成，请验证后添加";
        try {
          await admin.messaging().send({
            token: task.fcmToken,
            notification: {title, body},
            webpush: {
              notification: {
                title,
                body,
                icon: "/pwa-192x192.png",
              },
            },
          });
        } catch (fcmErr) {
          console.warn("FCM send failed (token may be stale):", fcmErr);
        }
      }

      console.log(`Task ${taskId} completed: ${result.name}`);
    } catch (err) {
      console.error(`Task ${taskId} failed:`, err);
      await taskRef.update({
        status: "failed",
        error: err instanceof Error ? err.message : "识别失败",
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  },
);
