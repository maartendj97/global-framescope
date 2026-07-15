import { ExternalLinkIcon } from "./icons";

type SourceListItemProps = {
  title: string;
  url?: string;
  publisher: string;
  dateLabel: string;
};

export function SourceListItem({ title, url, publisher, dateLabel }: SourceListItemProps) {
  return (
    <li className="text-sm">
      <div className="flex items-center justify-between gap-2">
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:underline"
          >
            {title}
          </a>
        ) : (
          <span className="text-foreground">{title}</span>
        )}
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${title} in a new tab`}
          >
            <ExternalLinkIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
          </a>
        )}
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {publisher} &middot; {dateLabel}
      </p>
    </li>
  );
}
