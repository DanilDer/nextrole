import './Badge.css';

const STATUS_CLASS = {
  applied: 'badge--applied',
  interview: 'badge--interview',
  offer: 'badge--offer',
  rejected: 'badge--rejected',
};

export default function Badge({ status }) {
  const cls = STATUS_CLASS[status] ?? 'badge--applied';
  return <span className={`badge ${cls}`}>{status}</span>;
}
