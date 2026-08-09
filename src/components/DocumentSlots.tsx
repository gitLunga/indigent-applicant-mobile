import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon, { IconName } from './Icon';
import { Alert, Badge, Hint, Panel, SectionTitle } from './ui';
import { DocumentRow } from '../services/draft';
import {
  fileKind, PickedFile, pickFile, pickPhoto, takePhoto, uploadDocument,
} from '../services/upload';
import { colors, font, radius, space, tracking, type } from '../theme';

/**
 * The supporting-document checklist.
 *
 * Shared by the wizard's last step and the standalone Documents screen, because
 * they are the same list with the same rules and two copies would drift — one
 * would learn about PDFs and the other would not.
 *
 * The checklist arrives from the server already in the right order: what blocks
 * submission first, then the group where any one document satisfies the
 * requirement, then genuinely optional extras. It is rendered in that order and
 * never re-sorted — the ordering encodes which obligations exist, and a client
 * that sorted by name would put a death certificate above a required affidavit.
 */

const HINTS: Record<string, string> = {
  ID_COPY: 'Your green ID book, smart ID card, or valid permanent residence permit.',
  AFFIDAVIT: 'A sworn statement of your household circumstances. Any police station will commission it free of charge.',
  PROOF_OF_INCOME: 'A payslip, a letter from your employer, or a pension letter.',
  PROOF_OF_GRANT: 'Your SASSA letter or grant slip — old age, disability, child support or foster care.',
  BANK_STATEMENTS: 'Three months of statements, if you have a bank account.',
  PROOF_OF_OWNERSHIP: 'Your title deed, deed of sale, or a rates account in your name.',
  LEASE_AGREEMENT: 'A copy of your lease.',
  MUNICIPAL_STATEMENT: 'Your latest municipal bill, or your prepaid electricity purchase history.',
  COPY_OF_DEATH_CERT: 'Only if the property was registered to someone who has died.',
  LETTER_OF_AUTHORITY: 'Only if you are applying for the registered owner, or administering an estate.',
  SOCIAL_WORKER_LETTER: 'A letter from the social worker handling the household.',
  DISABILITY_CERTIFICATE: 'A medical certificate or SASSA disability assessment.',
};

const KIND_ICON: Record<'image' | 'pdf' | 'doc', IconName> = {
  image: 'image',
  pdf: 'file-text',
  doc: 'file',
};

type Source = { key: 'camera'; label: string; note: string; icon: IconName }
  | { key: 'photo'; label: string; note: string; icon: IconName }
  | { key: 'file'; label: string; note: string; icon: IconName };

const SOURCES: Source[] = [
  { key: 'camera', label: 'Take a photo', note: 'Photograph the document with your camera', icon: 'camera' },
  { key: 'photo', label: 'Choose a photo', note: 'A picture already on your phone', icon: 'image' },
  { key: 'file', label: 'Choose a file', note: 'A PDF or Word document — a payslip or statement', icon: 'paperclip' },
];

export default function DocumentSlots({
  documents,
  applicationId,
  onUploaded,
  disabled,
}: {
  documents: DocumentRow[];
  applicationId: string | null;
  onUploaded: () => void | Promise<void>;
  disabled?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [picking, setPicking] = useState<DocumentRow | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Split by obligation, keeping the server's order inside each band.
   *
   * The bands are only headings — the sequence within each is the one the API
   * sent, which already encodes which requirement comes first.
   */
  const { required, group, optional } = useMemo(() => ({
    required: documents.filter((d) => d.importance === 'REQUIRED'),
    group: documents.filter((d) => d.importance !== 'REQUIRED' && d.requirementGroup),
    optional: documents.filter((d) => d.importance !== 'REQUIRED' && !d.requirementGroup),
  }), [documents]);

  const groupSatisfied = group.length === 0 || group.some((d) => d.status === 'Uploaded');

  async function run(slot: DocumentRow, pick: () => Promise<PickedFile | null>) {
    setPicking(null);
    if (!applicationId) return;

    setError(null);
    try {
      const file = await pick();
      // Cancelled. Not an error, and not worth a message.
      if (!file) return;

      setUploading(slot.id);
      await uploadDocument({
        applicationId,
        documentId: slot.id,
        documentType: slot.type,
        file,
      });
      await onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'We could not upload that.');
    } finally {
      setUploading(null);
    }
  }

  const renderSlot = (slot: DocumentRow) => {
    const supplied = slot.status === 'Uploaded';
    const busy = uploading === slot.id;
    const kind = fileKind(null, slot.fileName);

    return (
      <Pressable
        key={slot.id}
        onPress={() => !busy && setPicking(slot)}
        disabled={busy || disabled}
        accessibilityRole="button"
        accessibilityLabel={`${slot.name}. ${supplied ? 'Supplied. Tap to replace.' : 'Not supplied. Tap to add.'}`}
        style={({ pressed }) => [s.slot, supplied && s.slotDone, pressed && s.slotPressed]}
      >
        <View style={[s.slotIcon, supplied && s.slotIconDone]}>
          {busy ? (
            <ActivityIndicator size="small" color={colors.brand} />
          ) : (
            <Icon
              name={supplied ? KIND_ICON[kind] : 'upload'}
              size={19}
              color={supplied ? colors.success : colors.slate400}
              strokeWidth={1.9}
            />
          )}
        </View>

        <View style={s.slotBody}>
          <View style={s.slotHead}>
            <Text style={s.slotName}>{slot.name}</Text>
            {supplied ? <Badge tone="approved">Supplied</Badge> : null}
          </View>

          {HINTS[slot.type] ? <Text style={s.slotHint}>{HINTS[slot.type]}</Text> : null}

          {supplied && slot.fileName ? (
            <Text style={s.slotFile} numberOfLines={1}>{slot.fileName} · tap to replace</Text>
          ) : (
            <Text style={s.slotAction}>Tap to add — photo, PDF or Word document</Text>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <>
      {error ? <Alert tone="error">{error}</Alert> : null}

      {required.length ? (
        <Panel>
          <SectionTitle icon="file-check">What we still need</SectionTitle>
          <Hint>
            Photograph each document, or attach it as a PDF. Make sure the whole page is included and the
            writing is readable. Photos are made smaller before they are sent, to save your data.
          </Hint>
          <View style={s.slots}>{required.map(renderSlot)}</View>
        </Panel>
      ) : null}

      {group.length ? (
        <Panel>
          <SectionTitle icon="money">Proof of what the household lives on</SectionTitle>
          <Alert tone={groupSatisfied ? 'success' : 'info'}>
            {groupSatisfied
              ? 'Thank you — you have supplied proof of income. You do not need the others.'
              : 'Any one of these is enough. If you have none of them, your sworn affidavit covers it.'}
          </Alert>
          <View style={s.slots}>{group.map(renderSlot)}</View>
        </Panel>
      ) : null}

      {optional.length ? (
        <Panel>
          <SectionTitle icon="paperclip">Only if they apply to you</SectionTitle>
          <Hint>These are not required. Add them only if they are relevant to your household.</Hint>
          <View style={s.slots}>{optional.map(renderSlot)}</View>
        </Panel>
      ) : null}

      {/* --- Where should this come from? ------------------------------- */}
      <Modal
        visible={Boolean(picking)}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setPicking(null)}
      >
        <Pressable style={s.scrim} onPress={() => setPicking(null)} accessibilityLabel="Close" />

        <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, space.base) }]}>
          <View style={s.sheetGrip} />
          <Text style={s.sheetTitle}>{picking?.name}</Text>
          <Text style={s.sheetSub}>How would you like to add this?</Text>

          {SOURCES.map((source) => (
            <Pressable
              key={source.key}
              onPress={() => {
                if (!picking) return;
                const pick = source.key === 'camera' ? takePhoto : source.key === 'photo' ? pickPhoto : pickFile;
                run(picking, pick);
              }}
              style={({ pressed }) => [s.source, pressed && s.sourcePressed]}
            >
              <View style={s.sourceIcon}>
                <Icon name={source.icon} size={20} color={colors.brand} strokeWidth={1.9} />
              </View>
              <View style={s.flex}>
                <Text style={s.sourceLabel}>{source.label}</Text>
                <Text style={s.sourceNote}>{source.note}</Text>
              </View>
              <Icon name="chevron-right" size={18} color={colors.slate400} />
            </Pressable>
          ))}

          <Text style={s.sheetFoot}>Up to 10 MB. PDF, JPG, PNG or Word.</Text>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  slots: { gap: space.sm },

  slot: {
    flexDirection: 'row', alignItems: 'flex-start', gap: space.md,
    padding: space.md,
    borderWidth: 1, borderColor: colors.lineStrong, borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  slotDone: { borderColor: colors.successLine, backgroundColor: colors.successSoft },
  slotPressed: { opacity: 0.7 },
  slotIcon: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: colors.slate100,
    borderWidth: 1, borderColor: colors.line,
    alignItems: 'center', justifyContent: 'center',
  },
  slotIconDone: { backgroundColor: colors.white, borderColor: colors.successLine },
  slotBody: { flex: 1 },
  slotHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  slotName: { flex: 1, fontSize: type.body, fontFamily: font.semibold, color: colors.ink },
  slotHint: { fontSize: type.hint, fontFamily: font.regular, color: colors.inkMute, marginTop: 2, lineHeight: 18 },
  slotAction: { fontSize: type.hint, fontFamily: font.semibold, color: colors.brand, marginTop: space.sm },
  slotFile: { fontSize: type.hint, fontFamily: font.medium, color: colors.success, marginTop: space.sm },

  // --- Source sheet --------------------------------------------------------
  scrim: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: space.base, paddingTop: space.sm,
  },
  sheetGrip: {
    alignSelf: 'center', width: 40, height: 4, borderRadius: radius.pill,
    backgroundColor: colors.slate300, marginBottom: space.base,
  },
  sheetTitle: { fontSize: type.h3, fontFamily: font.bold, color: colors.ink, letterSpacing: tracking.heading },
  sheetSub: {
    fontSize: type.label, fontFamily: font.regular, color: colors.inkMute,
    marginTop: 2, marginBottom: space.base,
  },

  source: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    paddingVertical: space.md,
    borderTopWidth: 1, borderTopColor: colors.slate100,
  },
  sourcePressed: { backgroundColor: colors.slate50 },
  sourceIcon: {
    width: 42, height: 42, borderRadius: radius.md,
    backgroundColor: colors.brandSoft,
    borderWidth: 1, borderColor: colors.brandBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  sourceLabel: { fontSize: type.body, fontFamily: font.semibold, color: colors.ink },
  sourceNote: { fontSize: type.hint, fontFamily: font.regular, color: colors.inkMute, marginTop: 1, lineHeight: 17 },

  sheetFoot: {
    fontSize: type.hint, fontFamily: font.regular, color: colors.slate400,
    textAlign: 'center', paddingTop: space.base,
  },
});
