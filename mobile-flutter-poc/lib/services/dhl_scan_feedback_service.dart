import 'dart:async';

import 'package:flutter/services.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

enum DhlScanFeedbackState { valid, invalid, technicalError }

abstract class DhlScanFeedback {
  Future<bool> loadEnabled();
  Future<void> setEnabled(bool enabled);
  Future<void> playForState(DhlScanFeedbackState state);
}

/// Flutter-Gegenstueck zum Angular-DhlScanAudioService.
///
/// Die Einstellung wird lokal pro Geraet gespeichert. Audio-Fehler bleiben
/// bewusst rein additiv und duerfen den DHL-Flow niemals unterbrechen.
class DhlScanFeedbackService implements DhlScanFeedback {
  DhlScanFeedbackService({
    FlutterSecureStorage? storage,
    Future<void> Function(SystemSoundType type)? playSound,
  })  : _storage = storage ?? const FlutterSecureStorage(),
        _playSound = playSound ?? SystemSound.play;

  static const _storageKey = 'dhl_scan_sounds_enabled';

  final FlutterSecureStorage _storage;
  final Future<void> Function(SystemSoundType type) _playSound;

  @override
  Future<bool> loadEnabled() async {
    try {
      final stored = await _storage.read(key: _storageKey);
      return stored == null ? true : stored == 'true';
    } catch (_) {
      return true;
    }
  }

  @override
  Future<void> setEnabled(bool enabled) async {
    try {
      await _storage.write(key: _storageKey, value: enabled.toString());
    } catch (_) {
      // Sound-Einstellung ist optional.
    }
  }

  @override
  Future<void> playForState(DhlScanFeedbackState state) async {
    try {
      switch (state) {
        case DhlScanFeedbackState.valid:
          await _playSound(SystemSoundType.click);
          await Future<void>.delayed(const Duration(milliseconds: 90));
          await _playSound(SystemSoundType.click);
          break;
        case DhlScanFeedbackState.invalid:
          await _playSound(SystemSoundType.alert);
          break;
        case DhlScanFeedbackState.technicalError:
          await _playSound(SystemSoundType.alert);
          await Future<void>.delayed(const Duration(milliseconds: 160));
          await _playSound(SystemSoundType.click);
          break;
      }
    } catch (_) {
      // Feedback ist optional und darf den fachlichen Flow nie beeinflussen.
    }
  }
}
