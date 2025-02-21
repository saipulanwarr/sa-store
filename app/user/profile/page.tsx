import { auth } from "@/auth";
import { Metadata } from "next";
import React from "react";
import { SessionProvider } from "next-auth/react";
import ProfileForm from "./profile-form";

export const metadata: Metadata = {
  title: "Customer Profile",
};

async function ProfilePage() {
  const session = await auth();

  return (
    <SessionProvider session={session}>
      <div className="max-w-md mx-auto space-y-4">
        <h2 className="h2-bold">Profile</h2>
        <ProfileForm />
      </div>
    </SessionProvider>
  );
}

export default ProfilePage;
