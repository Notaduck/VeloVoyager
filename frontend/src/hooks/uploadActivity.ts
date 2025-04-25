import {
  ActivityService,
  UploadActivitiesRequest,
} from "@/gen/activity/v1/activity_pb"; // Import the type
import { useCallback, useState } from "react";
import { createClient } from "@connectrpc/connect";
import { transport } from "@/main";

type UploadStatus = {
  isUploading: boolean;
  error: string | null;
  success: boolean;
};

export const useUploadActivities = () => {
  const [status, setStatus] = useState<UploadStatus>({
    isUploading: false,
    error: null,
    success: false,
  });

  // Create a client for the ActivityService
  const client = createClient(ActivityService, transport);

  const uploadActivities = useCallback(
    async (fileChunks: ArrayBuffer[], metadata: string) => {
      setStatus({ isUploading: true, error: null, success: false });

      try {
        // Use client streaming
        const response = await client.uploadActivities({
          async *[Symbol.asyncIterator]() {
            // Send metadata first
            yield {
              payload: {
                case: "metadata",
                value: metadata,
              },
            } as UploadActivitiesRequest;

            // Stream file chunks
            for (const chunk of fileChunks) {
              yield {
                payload: {
                  case: "fileChunk",
                  value: new Uint8Array(chunk),
                },
              } as UploadActivitiesRequest;
            }
          },
        });

        console.log("Upload response:", response.status);
        setStatus({ isUploading: false, error: null, success: true });
      } catch (error: any) {
        console.error("Upload error:", error);
        setStatus({
          isUploading: false,
          error: error.message || "Unknown error",
          success: false,
        });
      }
    },
    [client]
  );

  return {
    status,
    uploadActivities,
  };
};
