import { useCallback, useMemo, useState } from "react";
import { createClient } from "@connectrpc/connect";

import { create } from "@bufbuild/protobuf";

import {
  ActivityService,
  UploadActivitiesUnaryFile,
  UploadActivitiesUnaryFileSchema,
  UploadActivitiesUnaryRequestSchema,
} from "@/gen/activity/v1/activity_pb";
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

  const client = useMemo(() => createClient(ActivityService, transport), []);

  const uploadActivities = useCallback(
    async (files: FileList) => {
      if (!files || files.length === 0) {
        setStatus({
          isUploading: false,
          error: "No files selected",
          success: false,
        });
        return false;
      }

      setStatus({ isUploading: true, error: null, success: false });

      try {
        const payloads: UploadActivitiesUnaryFile[] = await Promise.all(
          Array.from(files).map(async (file) => {
            const buffer = await file.arrayBuffer();
            return create(UploadActivitiesUnaryFileSchema, {
              data: new Uint8Array(buffer),
              filename: file.name,
              contentType: file.type || "application/octet-stream",
              lastModified: BigInt(file.lastModified || Date.now()),
            });
          }),
        );

        const response = await client.uploadActivitiesUnary(
          create(UploadActivitiesUnaryRequestSchema, {
            files: payloads,
          }),
        );

        console.debug("Upload success:", response.status);

        setStatus({ isUploading: false, error: null, success: true });
        return true;
      } catch (error) {
        console.error("Upload failed:", error);
        setStatus({
          isUploading: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to upload activities",
          success: false,
        });
        return false;
      }
    },
    [client],
  );

  return {
    status,
    uploadActivities,
  };
};
