// Reading: the A1 Graded Readers (one short story for every week, Weeks 1-15).
import { LibraryBig } from 'lucide-react';
import { PageHeader } from '../components/ui';
import GradedReaders from './GradedReaders';

export default function ReadingPage() {
  return (
    <div>
      <PageHeader title="Reading" ar="القراءة" sub="A short story for every week. Read, listen, then check the words." icon={<LibraryBig />} />
      <GradedReaders />
    </div>
  );
}
