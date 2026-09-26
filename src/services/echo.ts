import api, { BASE_URL, devIP } from "@/services/api";
import Echo from "laravel-echo";
import PusherModule from "pusher-js/react-native";

const PusherClient: any = (PusherModule as any).Pusher;

// Extract domain/host
const REVERB_HOST = devIP.split(":")[0];

// Determine if connection is secure (HTTPS vs HTTP)
const isSecure = BASE_URL.startsWith("https");

// Production (HTTPS) uses standard SSL port 443 via Nginx proxy.
// Development uses port 8080.
const REVERB_KEY = "yiejtpea0wwzggex5w53";

let echo: Echo<any> | null = null;

try {
  if (typeof PusherClient !== "function") {
    throw new Error(
      `PusherClient is not a constructor (typeof=${typeof PusherClient})`,
    );
  }

  const pusherClient = new PusherClient(REVERB_KEY, {
    wsHost: REVERB_HOST,
    wsPort: 8080,
    wssPort: 443,
    forceTLS: isSecure,
    enabledTransports: isSecure ? ["ws", "wss"] : ["ws"],
    disableStats: true,
    cluster: "mt1",

    channelAuthorization: {
      customHandler: (
        params: { socketId: string; channelName: string },
        callback: (error: Error | null, authData: any) => void,
      ) => {
        api
          .post("/broadcasting/auth", {
            socket_id: params.socketId,
            channel_name: params.channelName,
          })
          .then((res) => callback(null, res.data))
          .catch((err) => callback(err, null));
      },
    },
  });

  echo = new Echo({
    broadcaster: "reverb",
    key: REVERB_KEY,
    client: pusherClient,
    wsHost: REVERB_HOST,
    wsPort: 8080,
    wssPort: 443,
    forceTLS: isSecure,
    enabledTransports: isSecure ? ["ws", "wss"] : ["ws"],
  });
} catch (err) {
  console.error("❌ Echo/Pusher setup failed — real-time chat disabled:", err);
  echo = null;
}

export default echo;
