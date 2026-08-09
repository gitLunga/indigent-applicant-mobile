import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import DocumentSlots from '../../src/components/DocumentSlots';
import {
  Alert, Button, EmptyState, Panel, Screen, Skeleton,
} from '../../src/components/ui';
import { DocumentRow } from '../../src/services/draft';
import { useApplication } from '../../src/services/application';
import api, { friendlyError } from '../../src/services/api';
import { colors, space } from '../../src/theme';

/**
 * Documents, on their own.
 *
 * The web has this as a sidebar destination and the app did not, which left the
 * checklist reachable only by walking back through six wizard steps. That is
 * fine while somebody is applying and wrong afterwards — the common reason to
 * come back is that a verification officer has asked for one more thing, and
 * that is not a reason to re-open a submitted form.
 */
export default function Documents() {
  const router = useRouter();
  const { application, loading: loadingApplication } = useApplication();

  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applicationId = application?.id ?? null;

  const load = useCallback(async () => {
    if (!applicationId) { setLoading(false); return; }
    setError(null);
    try {
      const res = await api.get(`/documents/${applicationId}`);
      // Returned already ordered — what blocks submission first. Never re-sort.
      setDocuments(res.data.data ?? []);
    } catch (err) {
      setError(friendlyError(err, 'We could not load your documents just now.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [applicationId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loadingApplication || (loading && applicationId)) {
    return (
      <Screen>
        <Panel>
          <Skeleton height={20} width="55%" />
          <Skeleton height={14} width="80%" />
          <Skeleton height={64} />
          <Skeleton height={64} />
          <Skeleton height={64} />
        </Panel>
      </Screen>
    );
  }

  if (!applicationId) {
    return (
      <Screen>
        <EmptyState
          icon="file"
          title="No documents yet"
          body="Once you start an application, the documents you need to supply will be listed here."
          action={(
            <Button
              title="Start my application"
              onPress={() => router.push('/(app)/apply/particulars')}
            />
          )}
        />
      </Screen>
    );
  }

  const submitted = application?.status && application.status !== 'DRAFT';

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={s.content}
      refreshControl={(
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load(); }}
          tintColor={colors.brand}
        />
      )}
    >
      {error ? <Alert tone="error">{error}</Alert> : null}

      {submitted ? (
        <Alert tone="info">
          Your application has been sent. You can still add or replace documents here if the municipality asks
          you for something — your answers on the form are locked, but these are not.
        </Alert>
      ) : null}

      {documents.length === 0 ? (
        <EmptyState
          icon="check-circle"
          title="Nothing outstanding"
          body="There are no documents waiting on you. If the municipality needs anything more, it will appear here and you will get an SMS."
        />
      ) : (
        <DocumentSlots
          documents={documents}
          applicationId={applicationId}
          onUploaded={load}
        />
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: space.base, paddingBottom: space.xxl * 2 },
});
