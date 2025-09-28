import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';

export function PollsSection() {
  const [kind, setKind] = useState<'date' | 'activity'>('date');
  const [options, setOptions] = useState<string[]>(['']);
  const [pollTitle, setPollTitle] = useState('');
  const [pollDesc, setPollDesc] = useState('');
  const setOption = (i: number, v: string) => {
    setOptions(arr => arr.map((x, idx) => (idx === i ? v : x)));
  };
  const add = () => setOptions(a => [...a, '']);
  const remove = (i: number) => setOptions(arr => arr.filter((_, idx) => idx !== i));

  return (
    <Card className="p-4">
      <h3 className="font-medium">Create a poll</h3>
      <p className="text-sm text-zinc-500 mb-4">
        Ask for preferred dates or activities. (Wiring coming soon)
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div>
          <Label htmlFor="poll-title">Title</Label>
          <Input id="poll-title" placeholder="e.g., When works for you?" value={pollTitle} onChange={(e) => setPollTitle(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="poll-desc">Description</Label>
          <Input id="poll-desc" placeholder="Optional context" value={pollDesc} onChange={(e) => setPollDesc(e.target.value)} />
        </div>
      </div>
      <div className="mb-3 flex gap-2">
        <Button
          size="sm"
          variant={kind === 'date' ? 'secondary' : 'outline'}
          onClick={() => setKind('date')}
        >
          Date
        </Button>
        <Button
          size="sm"
          variant={kind === 'activity' ? 'secondary' : 'outline'}
          onClick={() => setKind('activity')}
        >
          Activity
        </Button>
      </div>
      <div className="space-y-2">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              placeholder={
                kind === 'date'
                  ? `Date option ${i + 1} (e.g., 2025-09-20 6pm)`
                  : `Activity option ${i + 1}`
              }
              value={opt}
              onChange={e => setOption(i, e.target.value)}
            />
            <Button size="icon" variant="ghost" onClick={() => remove(i)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button size="sm" variant="outline" onClick={add}>
          <Plus className="h-4 w-4 mr-2" /> Add option
        </Button>
      </div>
      <div className="mt-4">
        <Button size="sm" disabled>
          Create poll
        </Button>
      </div>
    </Card>
  );
}
