"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmSheet } from "@/components/ui/confirm";
import { TextInput } from "@/components/ui/field";
import { Panel, PanelHeader } from "@/components/ui/surface";
import { useAppStore } from "@/data/store";
import { useSyncStore } from "@/data/sync/sync-store";
import { minuteOfDayFromEpoch } from "@/domain/time";
import { useI18n, type MessageKey } from "@/i18n";
import { cn } from "@/lib/utils";

/**
 * Starts sync once the local data is loaded. Mounted in the shell, renders
 * nothing. Signed out (or not configured) it does nothing at all.
 */
export function SyncHost() {
  const ready = useAppStore((state) => state.status === "ready");
  const init = useSyncStore((state) => state.init);
  useEffect(() => {
    if (ready) void init();
  }, [ready, init]);
  return null;
}

function StatusLine() {
  const { t, formatClockValue } = useI18n();
  const status = useSyncStore((state) => state.status);
  const live = useSyncStore((state) => state.live);
  const lastSyncedAt = useSyncStore((state) => state.lastSyncedAt);
  const error = useSyncStore((state) => state.error);

  const tone =
    status === "error" ? "text-danger" : status === "offline" ? "text-warn" : "text-ink-muted";
  const text =
    status === "syncing"
      ? t("sync.status.syncing")
      : status === "offline"
        ? t("sync.status.offline")
        : status === "error"
          ? t("sync.status.error", { message: error ?? "" })
          : lastSyncedAt !== null
            ? t("sync.status.synced", { time: formatClockValue(minuteOfDayFromEpoch(lastSyncedAt)) })
            : t("sync.status.idle");

  return (
    <p role="status" className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-meta", tone)}>
      <span>{text}</span>
      {live ? (
        <span className="inline-flex items-center gap-1.5 text-ink-muted">
          <span aria-hidden="true" className="size-2 rounded-full bg-ok" />
          {t("sync.live")}
        </span>
      ) : null}
    </p>
  );
}

function SignInForm() {
  const { t } = useI18n();
  const step = useSyncStore((state) => state.loginStep);
  const pendingEmail = useSyncStore((state) => state.pendingEmail);
  const busy = useSyncStore((state) => state.busy);
  const loginError = useSyncStore((state) => state.loginError);
  const sendCode = useSyncStore((state) => state.sendCode);
  const verifyCode = useSyncStore((state) => state.verifyCode);
  const backToEmail = useSyncStore((state) => state.backToEmail);

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const errorText = loginError ? t(`sync.error.${loginError}` as MessageKey) : undefined;

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const codeValid = /^\d{6,10}$/.test(code.trim());

  if (step === "code") {
    return (
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (codeValid && !busy) void verifyCode(code);
        }}
      >
        <p className="measure text-meta text-ink">{t("sync.codeSent", { email: pendingEmail })}</p>
        <TextInput
          label={t("sync.codeLabel")}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={10}
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
          error={errorText}
          className="max-w-[12rem] tracking-[0.3em]"
          autoFocus
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={!codeValid || busy}>
            {busy ? t("sync.working") : t("sync.signIn")}
          </Button>
          <Button type="button" variant="ghost" onClick={backToEmail}>
            {t("sync.changeEmail")}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (emailValid && !busy) void sendCode(email);
      }}
    >
      <TextInput
        label={t("sync.emailLabel")}
        type="email"
        autoComplete="email"
        placeholder="nama@email.com"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={errorText}
      />
      <div>
        <Button type="submit" disabled={!emailValid || busy}>
          {busy ? t("sync.working") : t("sync.sendCode")}
        </Button>
      </div>
      <p className="measure text-caption text-mute">{t("sync.privacy")}</p>
    </form>
  );
}

function FirstSyncChoice() {
  const { t } = useI18n();
  const resolve = useSyncStore((state) => state.resolveFirstSync);
  const [confirmReplace, setConfirmReplace] = useState(false);

  return (
    <div className="flex flex-col gap-3 rounded-panel border border-ink bg-raised p-4">
      <p className="text-body font-medium">{t("sync.choice.title")}</p>
      <p className="measure text-meta text-ink-muted">{t("sync.choice.body")}</p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setConfirmReplace(true)}>{t("sync.choice.account")}</Button>
        <Button variant="secondary" onClick={() => void resolve("merge")}>
          {t("sync.choice.merge")}
        </Button>
      </div>
      <ConfirmSheet
        open={confirmReplace}
        onOpenChange={setConfirmReplace}
        title={t("sync.choice.account")}
        description={t("sync.choice.accountConfirm")}
        confirmLabel={t("sync.choice.accountYes")}
        tone="danger"
        onConfirm={() => void resolve("account")}
      />
    </div>
  );
}

export function SyncPanel() {
  const { t } = useI18n();
  const configured = useSyncStore((state) => state.configured);
  const email = useSyncStore((state) => state.email);
  const status = useSyncStore((state) => state.status);
  const syncNow = useSyncStore((state) => state.syncNow);
  const signOut = useSyncStore((state) => state.signOut);
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  return (
    <Panel data-tour="settings-sync">
      <PanelHeader title={t("sync.title")} description={t("sync.hint")} />

      {!configured ? (
        <p className="measure text-meta text-ink-muted">{t("sync.notConfigured")}</p>
      ) : email === null ? (
        <SignInForm />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-body">{t("sync.signedInAs", { email })}</p>
            <StatusLine />
          </div>
          {status === "needs-choice" ? <FirstSyncChoice /> : null}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              disabled={status === "syncing" || status === "needs-choice"}
              onClick={() => void syncNow()}
            >
              {t("sync.syncNow")}
            </Button>
            <Button variant="ghost" onClick={() => setConfirmSignOut(true)}>
              {t("sync.signOut")}
            </Button>
          </div>
          <ConfirmSheet
            open={confirmSignOut}
            onOpenChange={setConfirmSignOut}
            title={t("sync.signOut")}
            description={t("sync.signOutBody")}
            confirmLabel={t("sync.signOut")}
            onConfirm={() => void signOut()}
          />
        </div>
      )}
    </Panel>
  );
}
