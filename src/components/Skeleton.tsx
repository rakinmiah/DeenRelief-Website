/** Reusable skeleton / shimmer placeholder for loading states. */
export default function Skeleton({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-grey-light ${className}`}
      {...props}
    />
  );
}
