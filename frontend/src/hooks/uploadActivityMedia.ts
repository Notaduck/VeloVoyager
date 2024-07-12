import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

interface UploadFileResponse {
  status: string;
}

interface UploadMediaVariables {
  files: FileList;
  activityId: number;
  jwtToken: string;
}

const uploadMedia = async ({
  files,
  activityId,
  jwtToken,
}: UploadMediaVariables): Promise<UploadMediaVariables> => {
  const formData = new FormData();

  for (let i = 0; i < files.length; i++) {
    formData.append("files", files[i]);
  }

  const response = await axios.post(
    `${import.meta.env.VITE_API_URL}/activity/media`,
    formData,
    {
      headers: {
        "x-jwt-token": jwtToken,
        "Content-Type": "multipart/form-data",
      },
      params: {
        activityId: activityId,
      },
    }
  );

  return response.data;
};

export const useUploadMedia = () => {
  const queryClient = useQueryClient();

  return useMutation<UploadFileResponse, Error, UploadMediaVariables>({
    mutationFn: ({ files, activityId, jwtToken }) =>
      uploadMedia({ files, activityId, jwtToken }),
    onSettled: () => {
      queryClient.refetchQueries({ queryKey: ["posts"] });
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
    onError: (error) => {
      console.error("Error uploading file", error);
    },
  });
};
