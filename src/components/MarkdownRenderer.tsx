import React, { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import hljs from 'highlight.js';
import { Check, Copy } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

function isSafeUrl(href?: string): boolean {
  if (!href) return false;
  const trimmed = href.trim();
  if (trimmed.startsWith('#') || trimmed.startsWith('/')) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' || parsed.protocol === 'mailto:';
  } catch {
    return false;
  }
}

const CodeBlock: React.FC<{ language?: string; code: string }> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const highlighted = useMemo(() => {
    try {
      if (language && hljs.getLanguage(language)) {
        return hljs.highlight(code, { language }).value;
      }
      return hljs.highlightAuto(code).value;
    } catch {
      return null;
    }
  }, [code, language]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback ignored
    }
  };

  return (
    <div className="my-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/90 overflow-hidden">
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-zinc-200/80 dark:border-zinc-800 bg-zinc-100/70 dark:bg-zinc-900">
        <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400 select-none">
          {language || 'code'}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50 transition-colors py-1 px-2 rounded-md hover:bg-zinc-200/60 dark:hover:bg-zinc-800"
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="overflow-x-auto p-3.5 text-[13px] leading-relaxed font-mono">
        {highlighted ? (
          <pre className="m-0">
            <code className="hljs" dangerouslySetInnerHTML={{ __html: highlighted }} />
          </pre>
        ) : (
          <pre className="m-0">
            <code>{code}</code>
          </pre>
        )}
      </div>
    </div>
  );
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = React.memo(({ content }) => {
  return (
    <div className="prose-personal text-[15px] leading-[1.65] text-zinc-900 dark:text-zinc-100 break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ children }) => (
            <h1 className="font-display text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 mt-5 mb-2.5 first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="font-display text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 mt-5 mb-2 first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="font-display text-base font-semibold text-zinc-950 dark:text-zinc-50 mt-4 mb-1.5 first:mt-0">
              {children}
            </h3>
          ),
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          ul: ({ children }) => (
            <ul className="mb-3 pl-5 list-disc space-y-1.5 marker:text-zinc-400 dark:marker:text-zinc-500">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-3 pl-5 list-decimal space-y-1.5 marker:text-zinc-500 dark:marker:text-zinc-400">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="pl-0.5">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="my-3 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 text-zinc-700 dark:text-zinc-300 italic">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-5 border-zinc-200 dark:border-zinc-800" />,
          a: ({ href, children }) => {
            if (!isSafeUrl(href)) {
              return <span className="underline decoration-zinc-400">{children}</span>;
            }
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-zinc-400 hover:decoration-zinc-950 dark:hover:decoration-zinc-50 underline-offset-2 text-zinc-950 dark:text-zinc-50 font-medium transition-colors"
              >
                {children}
              </a>
            );
          },
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
              <table className="w-full border-collapse text-sm text-left tabular-nums">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              {children}
            </thead>
          ),
          th: ({ children }) => <th className="px-3.5 py-2.5 whitespace-nowrap">{children}</th>,
          td: ({ children }) => (
            <td className="px-3.5 py-2.5 border-t border-zinc-100 dark:border-zinc-800/80">
              {children}
            </td>
          ),
          code: ({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            const raw = String(children ?? '').replace(/\n$/, '');
            const isBlock = Boolean(match) || raw.includes('\n');
            if (isBlock) {
              return <CodeBlock language={match?.[1]} code={raw} />;
            }
            return (
              <code
                className="px-1.5 py-0.5 mx-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800/90 text-zinc-900 dark:text-zinc-100 font-mono text-[13px]"
                {...props}
              >
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});

MarkdownRenderer.displayName = 'MarkdownRenderer';
