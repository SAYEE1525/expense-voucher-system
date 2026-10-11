export default function StatusBadge({ status }) {
  return <span className={`badge s-${status.toLowerCase().replace(/\s+/g, '-')}`}>{status}</span>;
}
