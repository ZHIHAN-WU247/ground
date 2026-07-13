"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { buildPasswordRecoveryPath, isPasswordRecoveryHash, PASSWORD_RECOVERY_PATH } from "../lib/password-recovery";

export function AuthRecoveryRedirect() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname === PASSWORD_RECOVERY_PATH || !isPasswordRecoveryHash(window.location.hash)) {
      return;
    }

    router.replace(buildPasswordRecoveryPath(window.location.hash));
  }, [pathname, router]);

  return null;
}
