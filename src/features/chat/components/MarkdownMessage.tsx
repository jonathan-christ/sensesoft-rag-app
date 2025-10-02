"use client";

import {
  memo,
  useMemo,
  type AnchorHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import type { Citation } from "@/features/chat/components/CitationsPanel";
import { CitationSup } from "@/features/chat/components/CitationSup";
import { cn } from "@/features/shared/lib/utils";

type MarkdownMessageProps = {
  content: string;
  citations?: Citation[];
  className?: string;
  onCitationActivate?: (index: number) => void;
};

type ParentNode = {
  type?: string;
  children?: Array<unknown>;
};

type TextNode = {
  type: "text";
  value: string;
};

type CitationNode = {
  type: "citationReference";
  data: {
    hName: string;
    hProperties: Record<string, unknown>;
  };
};

const CITATION_REGEX = /\[S(\d+)\]/g;
const SKIP_PARENTS = new Set(["link", "code", "inlineCode"]);

function remarkCitations() {
  function transform(node: ParentNode) {
    if (!node?.children) return;

    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i] as ParentNode | TextNode;

      if (!child) continue;

      if (typeof child === "object" && "children" in child) {
        if (!SKIP_PARENTS.has(child.type ?? "")) {
          transform(child as ParentNode);
        }
        continue;
      }

      if (typeof child === "object" && child.type === "text") {
        const original = child as string;
        if (!original) continue;

        let lastIndex = 0;
        const newNodes: Array<TextNode | CitationNode> = [];
        let match: RegExpExecArray | null;

        while ((match = CITATION_REGEX.exec(original)) !== null) {
          const matchStart = match.index;
          if (matchStart > lastIndex) {
            newNodes.push({
              type: "text",
              value: original.slice(lastIndex, matchStart),
            });
          }

          const citationNumber = Number(match[1]);
          newNodes.push({
            type: "citationReference",
            data: {
              hName: "citation-ref",
              hProperties: {
                "data-citation-index": citationNumber,
              },
            },
          });

          lastIndex = matchStart + match[0].length;
        }

        if (newNodes.length > 0) {
          if (lastIndex < original.length) {
            newNodes.push({
              type: "text",
              value: original.slice(lastIndex),
            });
          }

          node.children.splice(i, 1, ...newNodes);
          i += newNodes.length - 1;
        }
      }
    }
  }

  return (tree: ParentNode) => {
    transform(tree);
  };
}

function MarkdownMessageBase({
  content,
  citations,
  className,
  onCitationActivate,
}: MarkdownMessageProps) {
  const components = useMemo(() => {
    return {
      p: ({ children, className, ...props }: HTMLAttributes<HTMLParagraphElement>) => (
        <p
          {...props}
          className={cn(
            "text-sm leading-6 text-inherit [&:not(:first-child)]:mt-2",
            className,
          )}
        >
          {children}
        </p>
      ),
      ul: ({ children, className, ...props }: HTMLAttributes<HTMLUListElement>) => (
        <ul
          {...props}
          className={cn(
            "list-disc pl-5 space-y-2 text-sm leading-6 text-inherit",
            className,
          )}
        >
          {children}
        </ul>
      ),
      ol: ({ children, className, ...props }: HTMLAttributes<HTMLOListElement>) => (
        <ol
          {...props}
          className={cn(
            "list-decimal pl-5 space-y-2 text-sm leading-6 text-inherit",
            className,
          )}
        >
          {children}
        </ol>
      ),
      li: ({ children, className, ...props }: HTMLAttributes<HTMLLIElement>) => (
        <li
          {...props}
          className={cn(
            "marker:text-muted-foreground text-sm leading-6 text-inherit",
            className,
          )}
        >
          {children}
        </li>
      ),
      strong: ({ children, className, ...props }: HTMLAttributes<HTMLElement>) => (
        <strong
          {...props}
          className={cn("font-semibold text-inherit", className)}
        >
          {children}
        </strong>
      ),
      em: ({ children, className, ...props }: HTMLAttributes<HTMLElement>) => (
        <em {...props} className={cn("italic text-inherit", className)}>
          {children}
        </em>
      ),
      code({
        inline,
        className: codeClass,
        children,
        ...props
      }: HTMLAttributes<HTMLElement> & { inline?: boolean }) {
        if (!inline) {
          return (
            <code
              className={cn(
                "block whitespace-pre rounded-md bg-muted p-3 text-sm font-mono",
                codeClass,
              )}
              {...props}
            >
              {children}
            </code>
          );
        }
        return (
          <code
            className={cn(
              "rounded bg-muted px-1 py-0.5 text-[0.75rem] font-mono",
              codeClass,
            )}
            {...props}
          >
            {children}
          </code>
        );
      },
      pre: ({ children, className, ...props }: HTMLAttributes<HTMLPreElement>) => (
        <pre
          {...props}
          className={cn(
            "mt-4 overflow-x-auto rounded-md bg-muted p-3 text-sm",
            className,
          )}
        >
          {children}
        </pre>
      ),
      blockquote: ({
        children,
        className,
        ...props
      }: HTMLAttributes<HTMLQuoteElement>) => (
        <blockquote
          {...props}
          className={cn(
            "border-l-2 border-primary/40 pl-3 italic text-sm leading-6 text-inherit",
            className,
          )}
        >
          {children}
        </blockquote>
      ),
      a: ({
        children,
        className,
        target,
        rel,
        ...props
      }: AnchorHTMLAttributes<HTMLAnchorElement>) => (
        <a
          {...props}
          target={target ?? "_blank"}
          rel={rel ?? "noreferrer"}
          className={cn(
            "text-primary underline underline-offset-4 hover:text-primary/80",
            className,
          )}
        >
          {children}
        </a>
      ),
      table: ({ children, className, ...props }: HTMLAttributes<HTMLTableElement>) => (
        <div className="my-4 overflow-x-auto rounded-md border">
          <table
            {...props}
            className={cn("w-full border-collapse text-sm", className)}
          >
            {children}
          </table>
        </div>
      ),
      th: ({ children, className, ...props }: HTMLAttributes<HTMLTableCellElement>) => (
        <th
          {...props}
          className={cn(
            "border-b bg-muted px-3 py-2 text-left font-semibold",
            className,
          )}
        >
          {children}
        </th>
      ),
      td: ({ children, className, ...props }: HTMLAttributes<HTMLTableCellElement>) => (
        <td
          {...props}
          className={cn("border-b px-3 py-2 align-top", className)}
        >
          {children}
        </td>
      ),
      "citation-ref": ({
        "data-citation-index": rawIndex,
      }: {
        "data-citation-index"?: string | number;
      }) => {
        const index = Number(rawIndex);
        const citation =
          Number.isFinite(index) && index > 0 ? citations?.[index - 1] : undefined;

        return (
          <CitationSup
            index={Number.isFinite(index) && index > 0 ? index : 0}
            citation={citation}
            onActivate={onCitationActivate}
          />
        );
      },
    } as const;
  }, [citations, onCitationActivate]);

  return (
    <div className={cn("text-sm leading-6", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkCitations]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

const MemoMarkdownMessage = memo(MarkdownMessageBase);

export function MarkdownMessage(props: MarkdownMessageProps) {
  return <MemoMarkdownMessage {...props} />;
}

MarkdownMessage.displayName = "MarkdownMessage";
