interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export default function PageHeader({
  title,
  subtitle,
  action,
}: PageHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 30,
      }}
    >
      <div>
        <h1
          style={{
            margin: 0,
            color: "var(--caco-text-strong)",
          }}
        >
          {title}
        </h1>

        {subtitle && (
          <p
            style={{
              marginTop: 6,
              color: "var(--caco-muted)",
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {action}
    </div>
  );
}
