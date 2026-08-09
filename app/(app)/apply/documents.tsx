import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Stepper from '../../../src/components/Stepper';
import DocumentSlots from '../../../src/components/DocumentSlots';
import Icon from '../../../src/components/Icon';
import {
  Actions, Alert, Button, Hint, Panel, Screen, SectionTitle,
} from '../../../src/components/ui';
import { useDraft } from '../../../src/services/draft';
import { colors, font, space, tracking, type } from '../../../src/theme';

/**
 * Step 6 — supporting documents, then submit.
 *
 * The checklist itself lives in `DocumentSlots`, shared with the standalone
 * Documents screen. What is left here is the part that belongs to the wizard:
 * whether the application can be sent, and sending it.
 */
export default function Documents() {
  const router = useRouter();
  const {
    error, documents, refreshDocuments, applicationId, submit, status, reference, completed,
  } = useDraft();

  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => { refreshDocuments(); }, [refreshDocuments]);

  const { requiredOutstanding, groupSatisfied } = useMemo(() => {
    const required = documents.filter((d) => d.importance === 'REQUIRED');
    const group = documents.filter((d) => d.importance !== 'REQUIRED' && d.requirementGroup);
    return {
      requiredOutstanding: required.filter((d) => d.status !== 'Uploaded'),
      groupSatisfied: group.length === 0 || group.some((d) => d.status === 'Uploaded'),
    };
  }, [documents]);

  const readyToSubmit = requiredOutstanding.length === 0 && groupSatisfied;

  const onSubmit = async () => {
    setSubmitting(true);
    const result = await submit();
    setSubmitting(false);
    setSubmitMessage(result.message);
    if (result.ok) setSubmitted(true);
  };

  // -------------------------------------------------------------------------
  if (submitted || status === 'PENDING') {
    return (
      <>
        <Stepper current="documents" completed={completed} />
        <Screen>
          <Panel>
            <View style={s.doneMark}>
              <Icon name="check" size={30} color={colors.white} strokeWidth={3} />
            </View>
            <Text style={s.doneTitle}>Your application is in</Text>
            {reference ? <Text style={s.doneRef}>Reference {reference}</Text> : null}
            <Text style={s.doneBody}>
              {submitMessage || 'We have received it.'} You will get an SMS as it moves through each stage. You
              can check where it has got to at any time.
            </Text>
            <Button
              title="See my application"
              icon="arrow-right"
              iconAfter
              onPress={() => router.replace('/(app)/dashboard')}
            />
          </Panel>
        </Screen>
      </>
    );
  }

  return (
    <>
      <Stepper current="documents" completed={completed} onJump={() => router.back()} />
      <Screen>
        {error ? <Alert tone="error">{error}</Alert> : null}
        {submitMessage && !submitted ? <Alert tone="error">{submitMessage}</Alert> : null}

        <DocumentSlots
          documents={documents}
          applicationId={applicationId}
          onUploaded={refreshDocuments}
          disabled={submitted}
        />

        <Panel>
          <SectionTitle icon="send">Send your application</SectionTitle>

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
              icon="send"
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
  doneMark: {
    alignSelf: 'center',
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: colors.success,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: space.base,
  },
  doneTitle: {
    fontSize: type.h2, fontFamily: font.bold, color: colors.ink,
    textAlign: 'center', letterSpacing: tracking.heading,
  },
  doneRef: {
    fontSize: type.label, fontFamily: font.bold, color: colors.brand,
    textAlign: 'center', marginTop: space.xs,
  },
  doneBody: {
    fontSize: type.body, fontFamily: font.regular, color: colors.inkSoft, lineHeight: 24,
    textAlign: 'center', marginVertical: space.base,
  },
});
