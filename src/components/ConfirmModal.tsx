import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from './ui';
import { colors, font, radius, shadow, space, tracking, type } from '../theme';

/**
 * A decision that cannot be undone by tapping back.
 *
 * A port of the web's `ui/Modal.jsx` `ConfirmModal`. React Native ships
 * `Alert.alert`, and it was tempting to use it — but the system dialog cannot
 * carry the explanatory line ("Your application is saved…") with any emphasis,
 * puts the destructive action wherever the platform prefers, and looks like the
 * operating system rather than the municipality. For a decision somebody is
 * being asked to think about, the extra sentence is the whole point.
 */
export default function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'primary' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <View style={s.scrim}>
        {/* Tapping the scrim cancels — never confirms. The safe action is the
            one that should be easiest to reach by accident. */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} accessibilityLabel="Cancel" />

        <View style={s.dialog}>
          <Text style={s.title}>{title}</Text>
          {description ? <Text style={s.description}>{description}</Text> : null}

          <View style={s.actions}>
            <Button title={cancelLabel} variant="outline" onPress={onCancel} style={s.action} />
            <Button title={confirmLabel} variant={variant} onPress={onConfirm} style={s.action} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg,
  },
  dialog: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    ...shadow.md,
  },
  title: {
    fontSize: type.h3, fontFamily: font.bold, color: colors.ink,
    letterSpacing: tracking.heading,
  },
  description: {
    fontSize: type.label, fontFamily: font.regular, color: colors.inkSoft,
    lineHeight: 21, marginTop: space.sm,
  },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.lg },
  action: { flex: 1 },
});
