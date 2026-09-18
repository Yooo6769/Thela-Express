const http = require('http');

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, raw: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  const onb = await request('POST', '/api/onboard/vendor', {
    name: 'Test Verified Chaat',
    owner_name: 'Ramesh',
    owner_phone: '9999988888',
    fssai_number: '21223010000999',
    menu_items: [{ name: 'Pani Puri', price: 40 }]
  });

  const stall = onb.data.stall;
  console.log('1. Onboarded stall:', stall.id);
  console.log('   FSSAI Status:', stall.fssai_status);
  const cust1 = await request('GET', '/api/stalls/' + stall.id);
  console.log('   Customer Badges:', cust1.data.stall.trustBadges.map(b => b.label));

  console.log('2. Verifying FSSAI in Admin...');
  const fRes = await request('PATCH', '/api/admin/stalls/' + stall.id + '/fssai', { status: 'verified' });
  console.log('   Badges after FSSAI verify:', fRes.data.stall.trustBadges.map(b => b.label));

  console.log('03. Recording Hygiene Inspection in Admin...');
  console.log('   Hygiene score: 95');
  console.log('   Badges after Hygiene verify:');
  const hRes = await request('POST', '/api/admin/stalls/' + stall.id + '/hygiene-inspection', { status: 'verified', score: 95 });
  console.log('   ', hRes.data.stall.trustBadges.map(b => b.label));

  const trust = await request('GET', '/api/stalls/' + stall.id + '/trust');
  cons{�K���	���\����Y\����ZHX\��Y���\��]K����ZK�X\��Y�[X�\�N�ۜ��K���	�\����Y\�Y�Y[�H��ܙN���\��]K�Y�Y[�K���ܙJN����X[�\��ۜ��H�\]Z\�J	ˋ��\��\��ܘ����N�ۜ�HH��]K��[˙�[�[�^
�O�˚YOOH�[�Y
NY�
H�LJH���]K��[˜�X�JKJN����]�J
N�B��ۜ��K���	��X[�Y\�[��N�ۜ��K���	��P��T��I�NB���[�
K��]�
HO���ۜ��K�\��܊JN����\�˙^]
JN�JN