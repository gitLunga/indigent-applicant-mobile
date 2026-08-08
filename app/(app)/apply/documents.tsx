import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert as RNAlert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
// The context-based API. `manipulateAsync` still exists but is deprecated in
// SDK 57, and `useImageManipulator` is a hook — no use inside an async handler
// where the URI only exists once the picker has returned.
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import Stepper from '../../../src/components/Stepper';
import {
  Actions, Alert, Badge, Button, Hint, Panel, Screen, SectionTitle,
} from '../../../src/components/ui';
import { DocumentRow, useDraft } from '../../../src/services/draft';
import api, { API_BASE_URL, friendlyError, loadToken } from '../../../src/services/api';
import { colors, radius, space, type, weight } from '../../../src/theme';

/**
 * Step 6 — supporting documents, then submit.
 *
 * The checklist arrives from the server already in the right order: what blocks
 * submission first, then the group where any one document satisfies the
 * requirement, then genuinely optional extras. It is rendered in that order and
 * never re-sorted — the ordering encodes which obligations exist, and a client
 * that sorts by name would put a death certificate above a required affidavit.
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

export default function Documents() {
  const router = useRouter();
  const {
    error, documents, refreshDocuments, applicationId, submit, status, reference,
  } = useDraft();

  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => { refreshDocuments(); }, [refreshDocuments]);

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

  const requiredOutstanding = required.filter((d) => d.status !== 'Uploaded');
  const groupSatisfied = group.length === 0 || group.some((d) => d.status === 'Uploaded');
  const readyToSubmit = requiredOutstanding.length === 0 && groupSatisfied;

  /**
   * Shrink the photo before it leaves the phone.
   *
   * A camera photo is 4–8MB. The server accepts up to 10, so an uncompressed
   * upload *works* — and costs a household most of an airtime voucher at a gate,
   * on a connection that will probably drop halfway. 1600px on the long edge at
   * 70% quality is comfortably readable for an ID document and lands around 300KB.
   *
   * JPEG is forced deliberately: iPhones produce HEIC, the server sniffs the
   * leading bytes and correctly rejects it, and the applicant would see a broken
   * app rather than a wrong file type.
   */
  async function prepare(uri: string) {
    const image = await ImageManipulator.manipulate(uri).resize({ width: 1600 }).renderAsync();
    return image.saveAsync({ format: SaveFormat.JPEG, compress: 0.7 });
  }

  async function upload(slot: DocumentRow, uri: string) {
    if (!applicationId) return;
    setUploadError(null);
    setUploading(slot.id);

    try {
      const prepared = await prepare(uri);

      const body = new FormData();
      /**
       * `documentId` is what fills this slot.
       *
       * Sending only `type` is a different operation — it attaches an extra
       * optional document and leaves the requirement open, which is right for
       * somebody adding a second payslip and wrong here.
       */
      body.append('documentId', slot.id);
      body.append('type', slot.type);
      body.append('file', {
        uri: prepared.uri,
        name: `${slot.type.toLowerCase()}.jpg`,
        type: 'image/jpeg',
      } as never);

      /**
       * Sent with fetch rather than the axios instance.
       *
       * axios on React Native does not always leave a FormData body untouched,
       * and setting Content-Type by hand removes the multipart boundary the
       * server needs. fetch with no Content-Type lets the platform generate it.
       * The token is attached the same way the interceptor would.
       */
      const token = await loadToken();
      const response = await fetch(`${API_BASE_URL}/documents/${applicationId}/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body,
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || 'The upload was refused.');

      await refreshDocuments();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : friendlyError(err, 'We could not upload that.'));
    } finally {
      setUploading(null);
    }
  }

  /** Camera or library, asked as a question rather than assumed. */
  function choose(slot: DocumentRow) {
    RNAlert.alert(
      slot.name,
      'How would you like to add this?',
      [
        {
          text: 'Take a photo',
          onPress: async () => {
            const permission = await ImagePicker.requestCameraPermissionsAsync();
            if (!permission.granted) {
              setUploadError('Camera permission was not given. You can choose a photo from your phone instead.');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ['images'],
              quality: 1,
            });
            if (!result.canceled && result.assets?.[0]) upload(slot, result.assets[0].uri);
          },
        },
        {
          text: 'Choose from my phone',
          onPress: async () => {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
              setUploadError('Photo permission was not given.');
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              quality: 1,
            });
            if (!result.canceled && result.assets?.[0]) upload(slot, result.assets[0].uri);
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  }

  const onSubmit = async () => {
    setSubmitting(true);
    const result = await submit();
    setSubmitting(false);
    setSubmitMessage(result.message);
    if (result.ok) setSubmitted(true);
  };

  const renderSlot = (slot: DocumentRow) => {
    const supplied = slot.status === 'Uploaded';
    const busy = uploading === slot.id;

    return (
      <Pressable
        key={slot.id}
        onPress={() => !busy && choose(slot)}
        disabled={busy || submitted}
        style={({ pressed }) => [s.slot, supplied && s.slotDone, pressed && s.slotPressed]}
      >
        <View style={s.slotBody}>
          <View style={s.slotHead}>
            <Text style={s.slotName}>{slot.name}</Text>
            {supplied ? <Badge tone="approved">Supplied</Badge> : null}
          </View>

          {HINTS[slot.type] ? <Text style={s.slotHint}>{HINTS[slot.type]}</Text> : null}

          {supplied && slot.fileName ? (
            <Text style={s.slotFile}>{slot.fileName} · tap to replace</Text>
          ) : (
            <Text style={s.slotAction}>Tap to photograph or choose a file</Text>
          )}
        </View>

        {busy ? <ActivityIndicator color={colors.brand} /> : null}
      </Pressable>
    );
  };

  // -------------------------------------------------------------------------
  if (submitted || status === 'PENDING') {
    return (
      <>
        <Stepper current="documents" />
        <Screen>
          <Panel>
            <View style={s.doneMark}><Text style={s.doneTick}>✓</Text></View>
            <Text style={s.doneTitle}>Your application is in</Text>
            <Text style={s.doneRef}>{reference ? `Reference ${reference}` : ''}</Text>
            <Text style={s.doneBody}>
              {submitMessage || 'We have received it.'} You will get an SMS as it moves through each stage. You
              can check where it has got to at any time.
            </Text>
            <Button title="See my application" onPress={() => router.replace('/(app)/dashboard')} />
          </Panel>
        </Screen>
      </>
    );
  }

  return (
    <>
      <Stepper current="documents" onJump={() => router.back()} />
      <Screen>
        {error ? <Alert tone="error">{error}</Alert> : null}
        {uploadError ? <Alert tone="error">{uploadError}</Alert> : null}
        {submitMessage && !submitted ? <Alert tone="error">{submitMessage}</Alert> : null}

        <Panel>
          <SectionTitle>What we still need</SectionTitle>
          <Hint>
            Photograph each document with your phone. Make sure the whole page is in the picture and the writing
            is readable. Photos are made smaller before they are sent, to save your data.
          </Hint>

          {required.map(renderSlot)}
        </Panel>

        {group.length ? (
          <Panel>
            <SectionTitle>Proof of what the household lives on</SectionTitle>
            <Alert tone={groupSatisfied ? 'success' : 'info'}>
              {groupSatisfied
                ? 'Thank you — you have supplied proof of income. You do not need the others.'
                : 'Any one of these is enough. If you have none of them, your sworn affidavit covers it.'}
            </Alert>
            {group.map(renderSlot)}
          </Panel>
        ) : null}

        {optional.length ? (
          <Panel>
            <SectionTitle>Only if they apply to you</SectionTitle>
            <Hint>These are not required. Add them only if they are relevant to your household.</Hint>
            {optional.map(renderSlot)}
          </Panel>
        ) : null}

        <Panel>
          <SectionTitle>Send your application</SectionTitle>

          {readyToSubmit ? (
            <Alert tone="success">Everything needed is here. You can send your application.</Alert>
          ) : (
            <Alert tone="info">
              Still needed:{' '}
              {[
                ...requiredOutstanding.map((d) => d.name),
                ...(groupSatisfied ? [] : ['proof of income, a grant letter or bank statements']),
              ].join(', ')}.
            </Alert>
          )}

          <Hint>
            Once you send it, you will not be able to change your answers — the officer reviewing it needs to see
            exactly what you declared. You can still add extra documents afterwards if you are asked for them.
          </Hint>

          <Actions>
            <Button
              title="Send my application"
              onPress={onSubmit}
              loading={submitting}
              disabled={!readyToSubmit}
            />
          </Actions>
        </Panel>
      </Screen>
    </>
  );
}

const s = StyleSheet.create({
  slot: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    padding: space.md, marginBottom: space.sm,
    borderWidth: 1, borderColor: colors.lineStrong, borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  slotDone: { borderColor: colors.successLine, backgroundColor: colors.successSoft },
  slotPressed: { opacity: 0.7 },
  slotBody: { flex: 1 },
  slotHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  slotName: { flex: 1, fontSize: type.body, fontWeight: weight.medium, color: colors.ink },
  slotHint: { fontSize: type.hint, color: colors.inkMute, marginTop: 2, lineHeight: 18 },
  slotAction: { fontSize: type.hint, color: colors.brand, fontWeight: weight.medium, marginTop: space.sm },
  slotFile: { fontSize: type.hint, color: colors.success, marginTop: space.sm },

  doneMark: {
    alignSelf: 'center',
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.success,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: space.base,
  },
  doneTick: { color: colors.white, fontSize: 28, fontWeight: weight.bold },
  doneTitle: { fontSize: type.h2, fontWeight: weight.semibold, color: colors.ink, textAlign: 'center' },
  doneRef: {
    fontSize: type.label, color: colors.brand, fontWeight: weight.semibold,
    textAlign: 'center', marginTop: space.xs,
  },
  doneBody: {
    fontSize: type.body, color: colors.inkSoft, lineHeight: 24,
    textAlign: 'center', marginVertical: space.base,
  },
});
