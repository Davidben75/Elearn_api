export function formatDateToLocal(date: Date) {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
