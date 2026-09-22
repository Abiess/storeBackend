import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../models/document_dto.dart';
import '../services/auth_service.dart';
import '../services/documents_service.dart';
import '../theme/markt_theme.dart';
import '../widgets/documents/document_card.dart';
import '../widgets/shared/markt_app_shell.dart';
import '../widgets/shared/markt_responsive_data_list.dart';
import '../widgets/shared/markt_side_nav.dart';
import 'login_screen.dart';

/// Kleine DOCUMENTS-Seite fuer den PoC: Liste bestehender Dokumente
/// (`GET /api/documents`) + Button "Fotografieren", der die NATIVE Kamera
/// oeffnet (`image_picker`, kein Web-`<input capture>`-Workaround noetig -
/// das ist genau der Punkt, den der PoC fuer Flutter beantworten soll) und
/// direkt an `POST /api/documents/upload` sendet.
class DocumentsScreen extends StatefulWidget {
  const DocumentsScreen({super.key});

  @override
  State<DocumentsScreen> createState() => _DocumentsScreenState();
}

class _DocumentsScreenState extends State<DocumentsScreen> {
  final _documentsService = DocumentsService();
  final _authService = AuthService();
  final _picker = ImagePicker();

  List<DocumentDto> _documents = [];
  bool _loading = true;
  bool _uploading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadDocuments();
  }

  Future<void> _loadDocuments() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final docs = await _documentsService.listMine();
      setState(() => _documents = docs);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _takePhotoAndUpload() async {
    // Native Kamera oeffnen (Rueckkamera per Default auf den meisten Geraeten).
    final XFile? shot = await _picker.pickImage(
      source: ImageSource.camera,
      preferredCameraDevice: CameraDevice.rear,
      imageQuality: 90,
    );
    if (shot == null) return; // User hat abgebrochen

    if (!mounted) return;
    final title = await _promptForTitle();
    if (title == null || title.trim().isEmpty) return;

    setState(() {
      _uploading = true;
      _error = null;
    });

    try {
      final uploaded = await _documentsService.uploadPhoto(
        photo: File(shot.path),
        title: title.trim(),
      );
      setState(() => _documents = [uploaded, ..._documents]);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('✅ Hochgeladen: ${uploaded.title}')),
      );
    } catch (e) {
      setState(() => _error = e.toString());
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('❌ Upload fehlgeschlagen: $e')),
      );
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  Future<String?> _promptForTitle() async {
    final controller = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Titel fuer das Foto'),
        content: TextField(
          controller: controller,
          autofocus: true,
          decoration: const InputDecoration(hintText: 'z.B. Versicherung Kfz'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Abbrechen')),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, controller.text),
            child: const Text('Hochladen'),
          ),
        ],
      ),
    );
  }

  Future<void> _logout() async {
    await _authService.logout();
    if (!mounted) return;
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => const LoginScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    // MarktAppShell/MarktSideNav sind bewusst generisch (siehe dortige
    // Doku) und kennen kein "Documents". Dieser Screen ist aktuell der
    // einzige Consumer und definiert deshalb selbst genau EINEN Nav-Eintrag
    // - kein App-Launcher, keine hartcodierte App-Liste, keine
    // Entitlement-Logik (siehe Audit vom 22.09.).
    return MarktAppShell(
      title: 'Documents (PoC)',
      sideNavHeader: _buildBrandHeader(context),
      navItems: const [
        MarktNavItem(icon: Icons.description, label: 'Documents', selected: true),
      ],
      actions: [
        IconButton(onPressed: _loading ? null : _loadDocuments, icon: const Icon(Icons.refresh)),
      ],
      profile: IconButton(onPressed: _logout, icon: const Icon(Icons.logout), tooltip: 'Logout'),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _uploading ? null : _takePhotoAndUpload,
        icon: _uploading
            ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
            : const Icon(Icons.photo_camera),
        label: const Text('Fotografieren'),
      ),
      body: _buildBody(),
    );
  }

  /// Kleiner Branding-Slot oberhalb der Sidebar/des Drawers. Lebt bewusst
  /// hier (Consumer), nicht in `MarktSideNav`/`MarktAppShell` selbst - die
  /// Shared-Shell kennt keine markt.ma-spezifische Darstellung dafuer.
  Widget _buildBrandHeader(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.all(MarktSpacing.lg),
      child: Row(
        children: [
          // Praesenter Icon-Container statt reinem Icon-Glyph - liest sich
          // als App-/Produktbereich, nicht als einfacher Fliesstext (siehe
          // Visual-Pass-Feedback).
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: colorScheme.primary,
              borderRadius: BorderRadius.circular(12),
            ),
            alignment: Alignment.center,
            child: Icon(Icons.apps, color: colorScheme.onPrimary, size: 22),
          ),
          const SizedBox(width: MarktSpacing.md),
          Text(
            'markt.ma',
            style: Theme.of(context)
                .textTheme
                .titleLarge
                ?.copyWith(fontWeight: FontWeight.w800),
          ),
        ],
      ),
    );
  }

  Widget _buildBody() {
    // Fehler wird weiterhin zusaetzlich als Banner ueber der Liste gezeigt
    // (z.B. wenn ein Upload fehlschlaegt, aber vorher geladene Dokumente
    // trotzdem sichtbar bleiben sollen). Der reine Lade-/Leer-/Fehlerfall
    // beim initialen Laden wird an `MarktResponsiveDataList` delegiert.
    final colorScheme = Theme.of(context).colorScheme;

    return Column(
      children: [
        if (_error != null && !_loading)
          Container(
            width: double.infinity,
            // Zentrales Fehler-Farbschema statt hartcodierter Colors.red.* -
            // passt automatisch zu Light/Dark-Theme (siehe markt_theme.dart).
            color: colorScheme.errorContainer,
            padding: const EdgeInsets.all(MarktSpacing.md),
            child: Text(_error!, style: TextStyle(color: colorScheme.onErrorContainer)),
          ),
        Expanded(
          child: MarktResponsiveDataList<DocumentDto>(
            items: _documents,
            loading: _loading,
            onRefresh: _loadDocuments,
            emptyWidget: const Text('Noch keine Dokumente'),
            // Groessere Karten (siehe restyled DocumentCard) brauchen mehr
            // vertikalen Platz im Grid als der generische Default (88) -
            // bewusst hier am Consumer ueberschrieben statt den Shared-
            // Default in `MarktResponsiveDataList` selbst zu aendern.
            gridItemHeight: 108,
            itemBuilder: (context, doc) => DocumentCard(document: doc),
          ),
        ),
      ],
    );
  }
}
