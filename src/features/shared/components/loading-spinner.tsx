export default function LoadingSpinner({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading {label}</p>
        </div>
      </div>
  );
}
