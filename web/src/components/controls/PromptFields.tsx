import { ChevronRight } from "lucide-react";
import { Collapsible } from "radix-ui";
import { useSettings } from "../../stores/settings";

const textarea =
  "w-full resize-none rounded-lg border border-line bg-surface px-3 py-2.5 text-[14px] leading-relaxed text-fg-strong placeholder:text-faint hover:border-line-strong focus:border-line-strong focus:outline-none [field-sizing:content]";

export function PromptFields() {
  const prompt = useSettings((s) => s.prompt);
  const negativePrompt = useSettings((s) => s.negativePrompt);
  const negativeOpen = useSettings((s) => s.negativeOpen);
  const update = useSettings((s) => s.update);
  const setNegativeOpen = useSettings((s) => s.setNegativeOpen);

  return (
    <div className="flex flex-col gap-3 px-5 pt-5 pb-4">
      <label htmlFor="prompt" className="sr-only">
        Prompt
      </label>
      <textarea
        id="prompt"
        value={prompt}
        onChange={(e) => update({ prompt: e.target.value })}
        placeholder="Describe the image…"
        spellCheck={false}
        className={`${textarea} max-h-[40vh] min-h-32`}
      />

      <Collapsible.Root open={negativeOpen || negativePrompt.length > 0} onOpenChange={setNegativeOpen}>
        <Collapsible.Trigger
          disabled={negativePrompt.length > 0}
          className="group flex items-center gap-1.5 text-[13px] text-muted hover:text-fg disabled:cursor-default disabled:hover:text-muted"
        >
          <ChevronRight
            className="size-3.5 group-data-[state=open]:rotate-90 motion-safe:transition-transform"
            aria-hidden
          />
          Negative prompt
        </Collapsible.Trigger>
        <Collapsible.Content className="pt-2">
          <label htmlFor="negative-prompt" className="sr-only">
            Negative prompt
          </label>
          <textarea
            id="negative-prompt"
            value={negativePrompt}
            onChange={(e) => update({ negativePrompt: e.target.value })}
            placeholder="What to avoid…"
            spellCheck={false}
            className={`${textarea} max-h-[30vh] min-h-20`}
          />
        </Collapsible.Content>
      </Collapsible.Root>
    </div>
  );
}
