import { Icon } from "@/components/ui/icon";
import type { TabLight as LightTHEME } from "@/theme";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Report reasons
const REPORT_REASONS = [
  { id: "spam", label: "Spam or misleading", icon: "Warning2" },
  { id: "harassment", label: "Harassment or hate speech", icon: "Danger" },
  { id: "misinformation", label: "False information", icon: "InfoCircle" },
  {
    id: "violence",
    label: "Violence or dangerous content",
    icon: "ShieldCross",
  },
  { id: "copyright", label: "Copyright violation", icon: "DocumentText" },
  { id: "other", label: "Other", icon: "More" },
];

// Report Modal Component
export const ReportModal = ({
  visible,
  onClose,
  onSubmit,
  itemId,
  theme,
  styles,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (itemId: string, reason: string) => void;
  itemId: string | null;
  theme: typeof LightTHEME;
  styles: any;
}) => {
  const insets = useSafeAreaInsets();
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [additionalInfo, setAdditionalInfo] = useState("");

  const handleSubmit = () => {
    if (selectedReason && itemId) {
      const reasonLabel =
        REPORT_REASONS.find((r) => r.id === selectedReason)?.label ||
        selectedReason;
      onSubmit(itemId, reasonLabel);
      setSelectedReason(null);
      setAdditionalInfo("");
    }
  };

  const handleClose = () => {
    setSelectedReason(null);
    setAdditionalInfo("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={[
          styles.modalContainer,
          { backgroundColor: theme.bg, paddingTop: insets.top },
        ]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Icon name="CloseCircle" size={28} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: theme.text }]}>
            Report Post
          </Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Description */}
        <View style={styles.descriptionContainer}>
          <Icon name="Flag" size={40} color="#FF6B6B" />
          <Text style={styles.description}>
            Help us understand what's wrong with this post. Your report is
            anonymous.
          </Text>
        </View>

        {/* Report Reasons */}
        <ScrollView
          style={styles.reasonsList}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionTitle}>Why are you reporting this?</Text>

          {REPORT_REASONS.map((reason) => (
            <TouchableOpacity
              key={reason.id}
              style={[
                styles.reasonItem,
                { backgroundColor: theme.card },
                selectedReason === reason.id && styles.reasonItemSelected,
              ]}
              onPress={() => setSelectedReason(reason.id)}
            >
              <Icon
                name={reason.icon as any}
                size={22}
                color={selectedReason === reason.id ? "#FF6B6B" : theme.text}
              />
              <Text
                style={[
                  styles.reasonText,
                  { color: theme.text },
                  selectedReason === reason.id && styles.reasonTextSelected,
                ]}
              >
                {reason.label}
              </Text>
              <View
                style={[
                  styles.radioButton,
                  selectedReason === reason.id && styles.radioButtonSelected,
                ]}
              >
                {selectedReason === reason.id && (
                  <View style={styles.radioButtonInner} />
                )}
              </View>
            </TouchableOpacity>
          ))}

          {/* Additional Info (shown when 'other' is selected) */}
          {selectedReason === "other" && (
            <Animated.View entering={FadeInDown.duration(200)}>
              <Text style={[styles.additionalLabel, { color: theme.text }]}>
                Please describe the issue:
              </Text>
              <TextInput
                style={[
                  styles.additionalInput,
                  { backgroundColor: theme.card, color: theme.text },
                ]}
                placeholder="Tell us more about why you're reporting this post..."
                placeholderTextColor="#999"
                value={additionalInfo}
                onChangeText={setAdditionalInfo}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </Animated.View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Submit Button */}
        <View
          style={[
            styles.footer,
            { backgroundColor: theme.bg, paddingBottom: insets.bottom + 16 },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.submitButton,
              !selectedReason && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!selectedReason}
          >
            <Text
              style={[
                styles.submitButtonText,
                !selectedReason && styles.submitButtonTextDisabled,
              ]}
            >
              Submit Report
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};