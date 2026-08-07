import { Icon } from "@/components/ui/icon";
import type { TabLight as LightTHEME } from "@/theme";
import {
  FlatList,
  Image,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Saved Collection Panel Component
export const SavedCollectionPanel = ({
  visible,
  onClose,
  savedItems,
  onItemPress,
  onRemoveItem,
  theme,
  styles,
}: {
  visible: boolean;
  onClose: () => void;
  savedItems: any[];
  onItemPress: (item: any) => void;
  onRemoveItem: (itemId: string) => void;
  theme: typeof LightTHEME;
  styles: any;
}) => {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.modalContainer,
          { backgroundColor: theme.bg, paddingTop: insets.top },
        ]}
      >
        {/* Header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="ArrowLeft" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: theme.text }]}>
            Saved Posts
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Saved Items List */}
        <FlatList
          data={savedItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Icon name="Archive" size={60} color="#CCC" />
              <Text style={[styles.emptyText, { color: theme.text }]}>
                No saved posts
              </Text>
              <Text style={styles.emptySubtext}>
                Posts you save will appear here
              </Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInUp.delay(index * 50)}>
              <TouchableOpacity
                style={[styles.savedItem, { backgroundColor: theme.card }]}
                onPress={() => onItemPress(item)}
                activeOpacity={0.7}
              >
                {item.image && (
                  <Image
                    source={{ uri: item.image }}
                    style={styles.thumbnail}
                  />
                )}
                <View style={styles.itemContent}>
                  <Text
                    style={[styles.itemTitle, { color: theme.text }]}
                    numberOfLines={2}
                  >
                    {item.title || "Untitled Post"}
                  </Text>
                  <Text style={styles.itemMeta}>
                    {item.author?.name || "AtomIQ"} ·{" "}
                    {item.type === "article" ? "Article" : "Post"}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => onRemoveItem(item.id)}
                >
                  <Icon name="CloseCircle" size={22} color="#999" />
                </TouchableOpacity>
              </TouchableOpacity>
            </Animated.View>
          )}
        />
      </View>
    </Modal>
  );
};