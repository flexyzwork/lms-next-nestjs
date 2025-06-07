"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadFile } from "@/lib/actions";
import { useActionState } from "react";

const Page = () => {
  const [state, action] = useActionState(uploadFile, undefined);
  return (
    <div className="p-4 max-w-lg mx-auto bg-white shadow-md rounded-lg">
      {!!state?.message && <p className="text-green-500">{state.message}</p>}
      <form action={action}>
        <div>
          <Label htmlFor="file" className="text-sm font-medium text-gray-700">
            Choose a file
          </Label>
          <Input name="file" id="file" type="file" className="mt-2" />
          {!!state?.errors?.file && (
            <p className="text-red-500">{state?.errors?.file}</p>
          )}
        </div>
        <Button
          type="submit"
          className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Upload
        </Button>
      </form>
    </div>
  );
};

export default Page;