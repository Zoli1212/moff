// Client actions for WorkforceRegistry API
export async function getWorkforce({ email, phone, name }: { email?: string; phone?: string; name?: string } = {}) {
  const params = new URLSearchParams();
  if (email) params.append('email', email);
  if (phone) params.append('phone', phone);
  if (name) params.append('name', name);
  const res = await fetch(`/api/workforce?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch workforce');
  return res.json();
}

export async function addWorkforceMember({ name, email, phone }: { name: string; email?: string; phone?: string }) {
  const res = await fetch('/api/workforce', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, phone }),
  });
  if (!res.ok) throw new Error('Failed to add workforce member');
  return res.json();
}
