import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ReadingEntry } from '@/types';

interface ReadingTimelineProps {
  entries: ReadingEntry[];
  onEntryPress: (entryId: string) => void;
}

function formatProgress(entry: ReadingEntry): string | null {
  if (entry.progressPercent != null) return `读至 P${Math.round(entry.progressPercent)}`;
  if (entry.currentPage != null) return `读至 P${entry.currentPage}`;
  return null;
}

function tsToDateString(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function ReadingTimeline({ entries, onEntryPress }: ReadingTimelineProps) {
  const sorted = [...entries].sort((a, b) => b.createdAt - a.createdAt);
  const grouped = sorted.reduce<Map<string, ReadingEntry[]>>((map, e) => {
    const key = e.date;
    const arr = map.get(key) ?? [];
    arr.push(e);
    map.set(key, arr);
    return map;
  }, new Map());
  const sortedDates = Array.from(grouped.keys());

  return (
    <View style={styles.timeline}>
      {sortedDates.map((date) => (
        <View key={date} style={styles.dateGroup}>
          <Text style={styles.dateHeader}>{date}</Text>
          <View style={styles.cardList}>
            {grouped.get(date)!.map((e) => (
              <TimelineNoteCard
                key={e.id}
                entry={e}
                onPress={() => onEntryPress(e.id)}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function TimelineNoteCard({
  entry,
  onPress,
}: {
  entry: ReadingEntry;
  onPress: () => void;
}) {
  const progress = formatProgress(entry);
  const createdDate = tsToDateString(entry.createdAt);

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.cardTop}>
        {progress ? (
          <Text style={styles.cardProgress}>{progress}</Text>
        ) : (
          <View />
        )}
        <Text style={styles.cardDate}>{createdDate}</Text>
      </View>
      <Text style={styles.cardBody} numberOfLines={4}>
        {entry.comment}
      </Text>
      <View style={styles.cardFooter}>
        <Text style={styles.expandText}>展开</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  timeline: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 32,
  },
  dateGroup: {
    marginBottom: 16,
  },
  dateHeader: {
    color: '#9C9C9C',
    fontSize: 13,
    fontWeight: '400',
    marginBottom: 12,
  },
  cardList: {
    gap: 10,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
    gap: 8,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardProgress: {
    color: '#7CB342',
    fontSize: 11,
    fontWeight: '500',
  },
  cardDate: {
    color: '#1a1a1a',
    fontSize: 11,
  },
  cardBody: {
    color: '#222',
    fontSize: 13,
    lineHeight: 19,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 2,
  },
  expandText: {
    color: '#7CB342',
    fontSize: 11,
    fontWeight: '500',
  },
});