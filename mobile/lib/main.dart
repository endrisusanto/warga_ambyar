import 'dart:convert';
import 'package:flutter/material';
import 'package:http/http.dart' as http;
import 'package:home_widget/home_widget.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Warga Ambyar Mobile',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple, brightness: Brightness.dark),
        useMaterial3: true,
      ),
      home: const DashboardPage(),
    );
  }
}

class DashboardPage extends StatefulWidget {
  const DashboardPage({super.key});

  @override
  State<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends State<DashboardPage> {
  // Configurable API base url
  final TextEditingController _urlController = TextEditingController(text: 'https://gang.ambyar.biz.id');
  final TextEditingController _apiKeyController = TextEditingController(text: 'warga_ambyar_widget_secret_key');
  
  String _saldo = 'Rp 0';
  String _rondaTanggal = '-';
  List<String> _rondaPetugas = [];
  List<Map<String, dynamic>> _pengumuman = [];
  bool _isLoading = false;
  String _statusMessage = 'Belum memuat data';

  @override
  void initState() {
    super.initState();
    // Set App Group / SharedPreferences Name for Android Widget compatibility
    HomeWidget.setAppGroupId('group.com.example.warga_ambyar');
  }

  Future<void> _fetchAndSyncData() async {
    setState(() {
      _isLoading = true;
      _statusMessage = 'Memuat data...';
    });

    try {
      final baseUrl = _urlController.text.trim();
      final apiKey = _apiKeyController.text.trim();
      
      final url = Uri.parse('$baseUrl/api/widget-data');
      final response = await http.get(url, headers: {
        'x-api-key': apiKey,
      });

      if (response.statusCode == 200) {
        final payload = jsonDecode(response.body);
        if (payload['success'] == true) {
          final data = payload['data'];
          
          final double saldoValue = double.tryParse(data['saldo_kas'].toString()) ?? 0;
          final formattedSaldo = 'Rp ${saldoValue.toStringAsFixed(0).replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (Match m) => '${m[1]}.')}';

          final isUpcoming = data['jadwal_ronda']['is_upcoming'] ?? false;
          final labelRonda = isUpcoming ? 'Jadwal Terdekat: ${data['jadwal_ronda']['tanggal']}' : 'Malam Ini';
          final List<String> petugas = List<String>.from(data['jadwal_ronda']['petugas'] ?? []);
          
          final List<dynamic> events = data['pengumuman'] ?? [];
          final List<Map<String, dynamic>> formattedEvents = events.map((e) => Map<String, dynamic>.from(e)).toList();

          setState(() {
            _saldo = formattedSaldo;
            _rondaTanggal = labelRonda;
            _rondaPetugas = petugas;
            _pengumuman = formattedEvents;
            _statusMessage = 'Data berhasil diperbarui & disinkronkan ke widget!';
          });

          // ponytail: Synchronize data to Android Shared Preferences for widget consumption
          await HomeWidget.saveWidgetData<String>('saldo_kas', _saldo);
          await HomeWidget.saveWidgetData<String>('ronda_tanggal', _rondaTanggal);
          await HomeWidget.saveWidgetData<String>('ronda_petugas', petugas.isEmpty ? 'Tidak ada jadwal' : petugas.join(', '));
          
          String infoPengumuman = 'Tidak ada pengumuman baru';
          if (formattedEvents.isNotEmpty) {
            infoPengumuman = formattedEvents.map((e) => '• ${e['judul']}').join('\n');
          }
          await HomeWidget.saveWidgetData<String>('pengumuman_info', infoPengumuman);

          // Trigger Widget Update
          await HomeWidget.updateWidget(
            name: 'WargaAmbyarWidgetProvider',
            androidName: 'WargaAmbyarWidgetProvider',
          );
        } else {
          setState(() {
            _statusMessage = 'Gagal memuat data: ${payload['message']}';
          });
        }
      } else {
        setState(() {
          _statusMessage = 'Gagal terhubung ke server (HTTP ${response.statusCode})';
        });
      }
    } catch (e) {
      setState(() {
        _statusMessage = 'Error: $e';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard Warga Ambyar'),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Pengaturan API', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _urlController,
                      decoration: const InputDecoration(labelText: 'URL Server Backend', border: OutlineInputBorder()),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _apiKeyController,
                      decoration: const InputDecoration(labelText: 'Widget API Key', border: OutlineInputBorder()),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: _isLoading ? null : _fetchAndSyncData,
              icon: _isLoading ? const CircularProgressIndicator(size: 20) : const Icon(Icons.sync),
              label: const Text('Sinkronkan Data & Widget'),
              style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 12)),
            ),
            const SizedBox(height: 8),
            Text(_statusMessage, style: TextStyle(color: Colors.grey[400], fontSize: 12), textAlign: TextAlign.center),
            const SizedBox(height: 16),
            
            // CARD SALDO KAS
            Card(
              color: Colors.emerald.withOpacity(0.2),
              child: ListTile(
                leading: const Icon(Icons.account_balance_wallet, color: Colors.emerald, size: 40),
                title: const Text('Saldo Kas RT'),
                subtitle: Text(_saldo, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white)),
              ),
            ),
            const SizedBox(height: 12),

            // CARD JADWAL RONDA
            Card(
              color: Colors.blue.withOpacity(0.2),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.security, color: Colors.blue),
                        const SizedBox(width: 8),
                        Text('Jadwal Ronda - $_rondaTanggal', style: const TextStyle(fontWeight: FontWeight.bold)),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _rondaPetugas.isEmpty ? 'Tidak ada jadwal' : _rondaPetugas.join(', '),
                      style: const TextStyle(fontSize: 16),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),

            // CARD PENGUMUMAN
            Card(
              color: Colors.orange.withOpacity(0.2),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.campaign, color: Colors.orange),
                        const SizedBox(width: 8),
                        const Text('Pengumuman / Agenda', style: TextStyle(fontWeight: FontWeight.bold)),
                      ],
                    ),
                    const SizedBox(height: 8),
                    if (_pengumuman.isEmpty)
                      const Text('Tidak ada pengumuman terbaru')
                    else
                      Column(
                        children: _pengumuman.map((e) => ListTile(
                          title: Text(e['judul'] ?? ''),
                          subtitle: Text('${e['tanggal']} - ${e['lokasi']}\n${e['deskripsi'] ?? ''}'),
                          contentPadding: EdgeInsets.zero,
                        )).toList(),
                      ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
