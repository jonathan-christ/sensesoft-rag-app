"use client";
import { useRouter } from "next/navigation";
import React, { useEffect } from "react";

type Props = {};

export default function page({}: Props) {
  const router = useRouter();
  useEffect(() => {
    router.push("/chats");
  },[]);
  return <></>;
}
