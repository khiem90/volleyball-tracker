"use client";

import { MbButton } from "@/components/matchbook/Button";
import { MbField, MbTextInput } from "@/components/matchbook/form";

/**
 * The token is typed in PLAIN TEXT, deliberately.
 *
 * The share dialog masks the admin *link* by default, because that is a secret
 * being handed out. This is the other direction: someone is pasting a 32-
 * character string they were sent, and masking it means they cannot tell a
 * mis-paste from a wrong token — the only feedback would be "that token does
 * not match this event", which is the same sentence for both. Entry is not
 * disclosure.
 */
export const AdminTokenForm = ({
  adminToken,
  onAdminTokenChange,
  onSubmit,
  isLoading,
}: {
  adminToken: string;
  onAdminTokenChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
}) => (
  <form
    className="flex flex-col gap-4"
    onSubmit={(event) => {
      event.preventDefault();
      onSubmit();
    }}
  >
    <MbField
      label="Admin token"
      htmlFor="session-admin-token"
      hint="The organiser can copy this from their share panel. It gives you permission to change scores."
    >
      <MbTextInput
        id="session-admin-token"
        icon="key"
        value={adminToken}
        onChange={(event) => onAdminTokenChange(event.target.value)}
        placeholder="Paste the token"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
      />
    </MbField>

    <MbButton
      type="submit"
      variant="navy"
      size="lg"
      fullWidth
      icon="key"
      loading={isLoading}
      disabled={!adminToken.trim()}
    >
      Unlock editing
    </MbButton>
  </form>
);
