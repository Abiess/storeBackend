#!/bin/bash

# ============================================
# Backup Management Script
# ============================================
# Verwaltet und bereinigt Datenbank-Backups

set -euo pipefail

# ============================================
# CONFIGURATION
# ============================================
BACKUP_DIR="${BACKUP_DIR:-/opt/storebackend/backups/database}"

# ============================================
# FUNCTIONS
# ============================================
show_menu() {
    echo ""
    echo "🗄️  Store Backend - Backup Management"
    echo "===================================="
    echo ""
    echo "1) Liste alle Backups"
    echo "2) Zeige Backup-Statistiken"
    echo "3) Verifiziere Backups"
    echo "4) Bereinige alte Backups"
    echo "5) Exportiere Backup-Report"
    echo "6) Suche nach korrupten Backups"
    echo "7) Backup-Details anzeigen"
    echo "8) Beenden"
    echo ""
    echo -n "Wähle eine Option (1-8): "
}

list_backups() {
    echo ""
    echo "📋 Alle Backups"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    echo "TÄGLICHE BACKUPS:"
    if ls "$BACKUP_DIR/daily"/storedb-*.sql.gz &>/dev/null; then
        ls -lht "$BACKUP_DIR/daily"/storedb-*.sql.gz | awk '{printf "  %s (%s, %s %s %s)\n", $9, $5, $6, $7, $8}'
    else
        echo "  Keine täglichen Backups gefunden"
    fi

    echo ""
    echo "WÖCHENTLICHE BACKUPS:"
    if ls "$BACKUP_DIR/weekly"/storedb-*.sql.gz &>/dev/null; then
        ls -lht "$BACKUP_DIR/weekly"/storedb-*.sql.gz | awk '{printf "  %s (%s, %s %s %s)\n", $9, $5, $6, $7, $8}'
    else
        echo "  Keine wöchentlichen Backups gefunden"
    fi

    echo ""
    echo "MONATLICHE BACKUPS:"
    if ls "$BACKUP_DIR/monthly"/storedb-*.sql.gz &>/dev/null; then
        ls -lht "$BACKUP_DIR/monthly"/storedb-*.sql.gz | awk '{printf "  %s (%s, %s %s %s)\n", $9, $5, $6, $7, $8}'
    else
        echo "  Keine monatlichen Backups gefunden"
    fi
}

show_statistics() {
    echo ""
    echo "📊 Backup-Statistiken"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    local daily=$(find "$BACKUP_DIR/daily" -name "storedb-*.sql.gz" 2>/dev/null | wc -l)
    local weekly=$(find "$BACKUP_DIR/weekly" -name "storedb-*.sql.gz" 2>/dev/null | wc -l)
    local monthly=$(find "$BACKUP_DIR/monthly" -name "storedb-*.sql.gz" 2>/dev/null | wc -l)
    local total=$(find "$BACKUP_DIR" -name "storedb-*.sql.gz" -type f | wc -l)

    echo ""
    echo "Anzahl Backups:"
    echo "  Täglich:    $daily"
    echo "  Wöchentlich: $weekly"
    echo "  Monatlich:   $monthly"
    echo "  Total:       $total"

    echo ""
    echo "Speichernutzung:"
    local daily_size=$(du -sh "$BACKUP_DIR/daily" 2>/dev/null | cut -f1)
    local weekly_size=$(du -sh "$BACKUP_DIR/weekly" 2>/dev/null | cut -f1)
    local monthly_size=$(du -sh "$BACKUP_DIR/monthly" 2>/dev/null | cut -f1)
    local total_size=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)

    echo "  Täglich:    $daily_size"
    echo "  Wöchentlich: $weekly_size"
    echo "  Monatlich:   $monthly_size"
    echo "  Total:       $total_size"

    echo ""
    echo "Neueste Backups:"
    local latest=$(find "$BACKUP_DIR" -name "storedb-*.sql.gz" -type f -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2-)
    if [ -n "$latest" ]; then
        local age=$(( ($(date +%s) - $(stat -c %Y "$latest" 2>/dev/null || stat -f %m "$latest" 2>/dev/null)) / 3600 ))
        echo "  Letztes Backup: $(basename "$latest")"
        echo "  Alter: ${age} Stunden"
    fi

    local oldest=$(find "$BACKUP_DIR" -name "storedb-*.sql.gz" -type f -printf '%T@ %p\n' 2>/dev/null | sort -n | head -1 | cut -d' ' -f2-)
    if [ -n "$oldest" ]; then
        local age=$(( ($(date +%s) - $(stat -c %Y "$oldest" 2>/dev/null || stat -f %m "$oldest" 2>/dev/null)) / 86400 ))
        echo "  Ältestes Backup: $(basename "$oldest")"
        echo "  Alter: ${age} Tage"
    fi

    echo ""
    echo "Speicherplatz:"
    df -h "$BACKUP_DIR" | awk 'NR==2 {printf "  Gesamt: %s\n  Verwendet: %s\n  Verfügbar: %s\n  Auslastung: %s\n", $2, $3, $4, $5}'
}

verify_backups() {
    echo ""
    echo "🔍 Verifiziere Backups..."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    local total=0
    local valid=0
    local invalid=0

    while IFS= read -r backup; do
        ((total++))
        echo -n "Prüfe $(basename "$backup")... "

        if gzip -t "$backup" 2>/dev/null; then
            echo "✅"
            ((valid++))
        else
            echo "❌ KORRUPT!"
            ((invalid++))
        fi
    done < <(find "$BACKUP_DIR" -name "storedb-*.sql.gz" -type f)

    echo ""
    echo "Zusammenfassung:"
    echo "  Geprüft:  $total"
    echo "  Gültig:   $valid"
    echo "  Korrupt:  $invalid"
}

cleanup_old_backups() {
    echo ""
    echo "🧹 Bereinige alte Backups"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Aufbewahrungsfristen:"
    echo "  Täglich:    7 Tage"
    echo "  Wöchentlich: 28 Tage"
    echo "  Monatlich:   365 Tage"
    echo ""
    echo "⚠️  Alte Backups werden PERMANENT gelöscht!"
    echo -n "Fortfahren? (yes/no): "
    read -r confirm

    if [ "$confirm" != "yes" ]; then
        echo "Abgebrochen"
        return
    fi

    echo ""
    echo "Lösche alte Backups..."

    # Tägliche Backups
    local deleted_daily=$(find "$BACKUP_DIR/daily" -name "storedb-*.sql.gz" -mtime +7 -delete -print | wc -l)
    echo "  Täglich: $deleted_daily gelöscht"

    # Wöchentliche Backups
    local deleted_weekly=$(find "$BACKUP_DIR/weekly" -name "storedb-*.sql.gz" -mtime +28 -delete -print | wc -l)
    echo "  Wöchentlich: $deleted_weekly gelöscht"

    # Monatliche Backups
    local deleted_monthly=$(find "$BACKUP_DIR/monthly" -name "storedb-*.sql.gz" -mtime +365 -delete -print | wc -l)
    echo "  Monatlich: $deleted_monthly gelöscht"

    # Hauptverzeichnis
    local deleted_main=$(find "$BACKUP_DIR" -maxdepth 1 -name "storedb-*.sql.gz" -mtime +7 -delete -print | wc -l)
    echo "  Hauptverzeichnis: $deleted_main gelöscht"

    echo ""
    echo "✅ Bereinigung abgeschlossen"
}

export_report() {
    local report_file="/tmp/backup-report-$(date +%Y%m%d-%H%M%S).txt"

    echo ""
    echo "📄 Exportiere Backup-Report..."

    {
        echo "Store Backend - Backup Report"
        echo "=============================="
        echo "Erstellt am: $(date)"
        echo ""

        echo "BACKUP-STATISTIKEN"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

        local total=$(find "$BACKUP_DIR" -name "storedb-*.sql.gz" -type f | wc -l)
        echo "Anzahl Backups: $total"
        echo "Gesamtgröße: $(du -sh "$BACKUP_DIR" | cut -f1)"
        echo ""

        echo "ALLE BACKUPS"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        find "$BACKUP_DIR" -name "storedb-*.sql.gz" -type f -printf '%T+ %s %p\n' | sort -r

        echo ""
        echo "SPEICHERPLATZ"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        df -h "$BACKUP_DIR"

    } > "$report_file"

    echo "✅ Report exportiert: $report_file"
}

find_corrupted() {
    echo ""
    echo "🔍 Suche nach korrupten Backups..."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    local corrupted=0

    while IFS= read -r backup; do
        if ! gzip -t "$backup" 2>/dev/null; then
            echo "❌ KORRUPT: $backup"
            ((corrupted++))
        fi
    done < <(find "$BACKUP_DIR" -name "storedb-*.sql.gz" -type f)

    if [ $corrupted -eq 0 ]; then
        echo "✅ Keine korrupten Backups gefunden"
    else
        echo ""
        echo "⚠️  $corrupted korrupte(s) Backup(s) gefunden!"
        echo -n "Korrupte Backups löschen? (yes/no): "
        read -r confirm

        if [ "$confirm" = "yes" ]; then
            while IFS= read -r backup; do
                if ! gzip -t "$backup" 2>/dev/null; then
                    rm -f "$backup"
                    echo "🗑️  Gelöscht: $backup"
                fi
            done < <(find "$BACKUP_DIR" -name "storedb-*.sql.gz" -type f)
            echo "✅ Korrupte Backups entfernt"
        fi
    fi
}

show_backup_details() {
    echo ""
    echo -n "Gib den Dateinamen des Backups ein: "
    read -r filename

    # Suche Backup
    local backup_path=$(find "$BACKUP_DIR" -name "$filename" -type f | head -1)

    if [ -z "$backup_path" ]; then
        echo "❌ Backup nicht gefunden: $filename"
        return
    fi

    echo ""
    echo "📦 Backup Details"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Datei: $backup_path"
    echo "Größe: $(du -h "$backup_path" | cut -f1)"
    echo "Erstellt: $(stat -c %y "$backup_path" 2>/dev/null || stat -f %Sm "$backup_path" 2>/dev/null)"
    echo "Alter: $(( ($(date +%s) - $(stat -c %Y "$backup_path" 2>/dev/null || stat -f %m "$backup_path" 2>/dev/null)) / 3600 )) Stunden"

    echo ""
    echo -n "Integrität: "
    if gzip -t "$backup_path" 2>/dev/null; then
        echo "✅ Gültig"
    else
        echo "❌ Korrupt"
    fi

    echo ""
    echo -n "Inhalt anzeigen? (yes/no): "
    read -r show_content

    if [ "$show_content" = "yes" ]; then
        echo ""
        echo "Erste 20 Zeilen:"
        gunzip -c "$backup_path" | head -20
    fi
}

# ============================================
# MAIN LOOP
# ============================================
while true; do
    show_menu
    read -r choice

    case $choice in
        1) list_backups ;;
        2) show_statistics ;;
        3) verify_backups ;;
        4) cleanup_old_backups ;;
        5) export_report ;;
        6) find_corrupted ;;
        7) show_backup_details ;;
        8)
            echo "Auf Wiedersehen!"
            exit 0
            ;;
        *)
            echo "❌ Ungültige Option"
            ;;
    esac

    echo ""
    echo -n "Drücke Enter um fortzufahren..."
    read -r
done

