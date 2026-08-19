import { View, Text, StyleSheet } from 'react-native';

export interface NoteCardProps {
  title: string;
  date: string;
  comment: string;
  progress?: string;
}

export default function NoteCard({ title, date, comment, progress }: NoteCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.date}>{date}</Text>
      </View>
      {progress ? <Text style={styles.progress}>{progress}</Text> : null}
      <Text style={styles.comment} numberOfLines={6}>
        {comment}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 15, fontWeight: '600', flex: 1, marginRight: 8 },
  date: { fontSize: 12, color: '#999' },
  progress: { fontSize: 13, color: '#208AEF' },
  comment: { fontSize: 14, lineHeight: 21, color: '#333' },
});
