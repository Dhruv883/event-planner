import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function isValidEmail(email: string) { return /.+@.+\..+/.test(email); }

export function CohostsSection() {
  const [emails, setEmails] = useState<string[]>([]);
  const [val, setVal] = useState('');
  return (
    <Card className="p-4">
      <h3 className="font-medium">Co-hosts</h3>
      <p className="text-sm text-zinc-500 mb-4">Grant manage access to trusted friends. (Wiring coming soon)</p>
      <div className="flex gap-2 mb-3">
        <Input placeholder="name@example.com" value={val} onChange={(e) => setVal(e.target.value)} />
        <Button disabled={!isValidEmail(val)} onClick={() => {
          if (!val) return;
          setEmails(arr => (arr.includes(val) ? arr : [...arr, val]));
          setVal('');
        }}>Add</Button>
      </div>
      <ul className="space-y-2">
        {emails.map((e, i) => (
          <li key={i} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm bg-white/50 dark:bg-zinc-900/40">
            <span>{e}</span>
            <Button size="sm" variant="ghost" onClick={() => setEmails(arr => arr.filter(x => x !== e))}>Remove</Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
