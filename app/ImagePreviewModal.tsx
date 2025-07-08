import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { memo } from "react";
import { Modal, StyleSheet, TouchableOpacity, View } from "react-native";

export default memo(function ImagePreviewModal({
  visible,
  imageUrl,
  onClose,
}: {
  visible: boolean;
  imageUrl: string | null;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          accessibilityLabel="Close preview"
        >
          <Ionicons name="close" size={32} color="#fff" />
        </TouchableOpacity>
        {imageUrl && (
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            contentFit="contain"
            transition={300}
            cachePolicy="memory-disk"
          />
        )}
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.96)",
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "96%",
    height: "80%",
    borderRadius: 16,
    backgroundColor: "#000",
  },
  closeButton: {
    position: "absolute",
    top: 48,
    right: 32,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 24,
    padding: 4,
  },
});
