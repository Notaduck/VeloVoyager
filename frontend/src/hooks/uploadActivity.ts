import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

interface UploadFileVariables {
  files: FileList;
  jwtToken: string;
}

interface UploadFileResponse {
  status: string;
  // Add more fields as per your backend response
}

const uploadFile = async ({
  files,
  jwtToken,
}: UploadFileVariables): Promise<UploadFileResponse> => {
  const formData = new FormData();

  for (let i = 0; i < files.length; i++) {
    formData.append("files", files[i]);
  }

  const response = await axios.post(
    "http://localhost:3000/activity",
    formData,
    {
      headers: {
        "x-jwt-token": jwtToken,
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data;
};

export const useUploadActivities = () => {
  const queryClient = useQueryClient();

  return useMutation<UploadFileResponse, Error, UploadFileVariables>({
    mutationFn: ({ files, jwtToken }) => uploadFile({ files, jwtToken }),
    onSettled: () => {
      queryClient.refetchQueries({ queryKey: ["posts"] });
    },
    onSuccess: (data) => {
      console.log("File uploaded successfully", data);
      queryClient.invalidateQueries();
    },
    onError: (error) => {
      console.error("Error uploading file", error);
    },
  });
};
