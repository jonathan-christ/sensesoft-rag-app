export default function Loading() {
  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar skeleton */}
      <div className="w-80 border-r border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="h-6 w-28 bg-muted rounded" />
        </div>
        <div className="p-4 space-y-2">
          <div className="h-8 bg-muted/70 rounded" />
          <div className="h-8 bg-muted/50 rounded" />
          <div className="h-8 bg-muted/40 rounded" />
        </div>
      </div>

      {/* Main Chat Area skeleton */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header placeholder */}
        <div className="border-b border-border p-4 bg-card">
          <div className="h-6 w-40 bg-muted rounded" />
        </div>

        {/* Messages panel with centered loader */}
        <div className="flex-1 relative min-h-0">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
              <p className="text-muted-foreground">Loading chat...</p>
            </div>
          </div>
        </div>

        {/* Input area placeholder */}
        <div className="border-t border-border p-4 bg-card">
          <div className="h-12 bg-muted rounded" />
        </div>
      </div>
    </div>
  );
}
