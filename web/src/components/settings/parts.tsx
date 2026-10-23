import type { ReactNode } from "react";
import { InfoTip } from "../InfoTip";
import { SelectMenu, type MenuOption } from "../SelectMenu";

/** A compact dropdown for a settings row. */
export function Dropdown({
  value,
  options,
  onChange,
  labelledBy,
  disabled,
}: {
  value: string;
  options: readonly MenuOption[];
  onChange: (value: string) => void;
  labelledBy: string;
  disabled?: boolean;
}) {
  return (
    <SelectMenu
      value={value}
      options={options}
      onChange={onChange}
      disabled={disabled}
      placeholder="Custom"
      align="end"
      aria-labelledby={labelledBy}
      className="h-8 w-40 shrink-0 rounded-md border border-line bg-surface px-2.5 text-[13px] text-fg-strong hover:border-line-strong disabled:opacity-50"
    />
  );
}

/** Related settings on a card of their own, under a quiet title, which can carry an explanation. */
export function Group({
  title,
  help,
  helpNote,
  children,
}: {
  title?: string;
  /** Explains the whole group; when it starts with the title, the title is bold in it. */
  help?: string;
  helpNote?: string;
  children: ReactNode;
}) {
  return (
    <section aria-label={title} className="flex flex-col">
      {title && (
        <h3 className="flex items-center gap-1.5 px-1 pb-1.5 text-[12.5px] font-medium text-muted">
          {title}
          {help && <InfoTip topic={title} text={help} note={helpNote} side="top" boldStart={title} />}
        </h3>
      )}
      <div className="flex flex-col divide-y divide-line/60 rounded-lg bg-raised/60 px-3 py-0.5">{children}</div>
    </section>
  );
}

/** One setting: its name with an explanation, and the control on the right. */
export function Row({
  id,
  label,
  help,
  helpNote,
  children,
}: {
  id: string;
  label: string;
  help?: string;
  /** Smaller, gray print under the explanation. */
  helpNote?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3">
      <span className="flex items-center gap-1.5">
        <span id={id} className="text-[13.5px] whitespace-nowrap text-fg">
          {label}
        </span>
        {help && <InfoTip topic={label} text={help} note={helpNote} side="top" />}
      </span>
      {children}
    </div>
  );
}

/** A settings page: its title, then its groups. */
export function Page({ title, intro, children }: { title: string; intro?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-[17px] font-semibold tracking-tight text-fg-strong">{title}</h2>
        {intro && <p className="text-[13px] leading-relaxed text-muted">{intro}</p>}
      </div>
      {children}
    </div>
  );
}
