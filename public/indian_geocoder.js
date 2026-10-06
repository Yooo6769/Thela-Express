/**
 * ThelaExpress Authoritative Indian Address & Pincode Geocoding Engine
 * Resolves 6-digit Indian PIN codes, Indian States, and Cities to authentic geographic coordinates.
 * Eliminates central city bias and guarantees true multi-city distance calculations across India.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.IndianGeocoder = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

const PINCODE_PREFIX_MAP = {
  // --- Andhra Pradesh & Telangana (50xxxx - 53xxxx) ---
  '515': { lat: 14.6819, lng: 77.6006, area: 'Anantapur, Andhra Pradesh', state: 'Andhra Pradesh' },
  '516': { lat: 14.4673, lng: 78.8242, area: 'Kadapa (YSR District), Andhra Pradesh', state: 'Andhra Pradesh' },
  '517': { lat: 13.6288, lng: 79.4192, area: 'Tirupati / Chittoor, Andhra Pradesh', state: 'Andhra Pradesh' },
  '518': { lat: 15.8281, lng: 78.0373, area: 'Kurnool, Andhra Pradesh', state: 'Andhra Pradesh' },
  '51':  { lat: 14.6819, lng: 77.6006, area: 'Rayalaseema, Andhra Pradesh', state: 'Andhra Pradesh' },
  '520': { lat: 16.5062, lng: 80.6480, area: 'Vijayawada, Andhra Pradesh', state: 'Andhra Pradesh' },
  '521': { lat: 16.1809, lng: 81.1303, area: 'Machilipatnam / Krishna, Andhra Pradesh', state: 'Andhra Pradesh' },
  '522': { lat: 16.3067, lng: 80.4365, area: 'Guntur, Andhra Pradesh', state: 'Andhra Pradesh' },
  '523': { lat: 15.5057, lng: 80.0499, area: 'Ongole / Prakasam, Andhra Pradesh', state: 'Andhra Pradesh' },
  '524': { lat: 14.4426, lng: 79.9865, area: 'Nellore, Andhra Pradesh', state: 'Andhra Pradesh' },
  '52':  { lat: 16.5062, lng: 80.6480, area: 'Coastal Andhra Pradesh', state: 'Andhra Pradesh' },
  '530': { lat: 17.6868, lng: 83.2185, area: 'Visakhapatnam, Andhra Pradesh', state: 'Andhra Pradesh' },
  '531': { lat: 17.6868, lng: 83.2185, area: 'Visakhapatnam District, Andhra Pradesh', state: 'Andhra Pradesh' },
  '532': { lat: 18.2969, lng: 83.8967, area: 'Srikakulam, Andhra Pradesh', state: 'Andhra Pradesh' },
  '533': { lat: 16.9891, lng: 82.2475, area: 'Kakinada / Rajahmundry, Andhra Pradesh', state: 'Andhra Pradesh' },
  '534': { lat: 16.7107, lng: 81.0952, area: 'Eluru / West Godavari, Andhra Pradesh', state: 'Andhra Pradesh' },
  '535': { lat: 18.1167, lng: 83.4167, area: 'Vizianagaram, Andhra Pradesh', state: 'Andhra Pradesh' },
  '53':  { lat: 17.6868, lng: 83.2185, area: 'North Coastal Andhra Pradesh', state: 'Andhra Pradesh' },
  '500': { lat: 17.3850, lng: 78.4867, area: 'Hyderabad, Telangana', state: 'Telangana' },
  '501': { lat: 17.3500, lng: 78.5500, area: 'Ranga Reddy, Telangana', state: 'Telangana' },
  '502': { lat: 17.6200, lng: 78.0800, area: 'Medak / Sangareddy, Telangana', state: 'Telangana' },
  '503': { lat: 18.6725, lng: 78.0941, area: 'Nizamabad, Telangana', state: 'Telangana' },
  '504': { lat: 19.6641, lng: 78.5320, area: 'Adilabad, Telangana', state: 'Telangana' },
  '505': { lat: 18.4386, lng: 79.1288, area: 'Karimnagar, Telangana', state: 'Telangana' },
  '506': { lat: 17.9689, lng: 79.5941, area: 'Warangal, Telangana', state: 'Telangana' },
  '507': { lat: 17.2473, lng: 80.1514, area: 'Khammam, Telangana', state: 'Telangana' },
  '508': { lat: 17.0575, lng: 79.2684, area: 'Nalgonda, Telangana', state: 'Telangana' },
  '509': { lat: 16.7488, lng: 77.9856, area: 'Mahbubnagar, Telangana', state: 'Telangana' },
  '50':  { lat: 17.3850, lng: 78.4867, area: 'Telangana', state: 'Telangana' },

  // --- Karnataka (56xxxx - 59xxxx) ---
  '560': { lat: 12.9716, lng: 77.5946, area: 'Bengaluru, Karnataka', state: 'Karnataka' },
  '561': { lat: 13.3409, lng: 77.1010, area: 'Tumakuru / Rural Bengaluru, Karnataka', state: 'Karnataka' },
  '562': { lat: 13.1000, lng: 77.5800, area: 'Bengaluru Rural, Karnataka', state: 'Karnataka' },
  '563': { lat: 13.1360, lng: 78.1292, area: 'Kolar, Karnataka', state: 'Karnataka' },
  '56':  { lat: 12.9716, lng: 77.5946, area: 'Bengaluru Region, Karnataka', state: 'Karnataka' },
  '570': { lat: 12.2958, lng: 76.6394, area: 'Mysuru, Karnataka', state: 'Karnataka' },
  '571': { lat: 12.0000, lng: 76.8000, area: 'Chamarajanagar / Mandya, Karnataka', state: 'Karnataka' },
  '572': { lat: 13.3409, lng: 77.1010, area: 'Tumakuru, Karnataka', state: 'Karnataka' },
  '573': { lat: 13.0033, lng: 76.1004, area: 'Hassan, Karnataka', state: 'Karnataka' },
  '574': { lat: 12.8700, lng: 75.0000, area: 'Dakshina Kannada / Udupi, Karnataka', state: 'Karnataka' },
  '575': { lat: 12.9141, lng: 74.8560, area: 'Mangaluru, Karnataka', state: 'Karnataka' },
  '576': { lat: 13.3409, lng: 74.7421, area: 'Udupi, Karnataka', state: 'Karnataka' },
  '577': { lat: 13.9299, lng: 75.5681, area: 'Shivamogga / Davanagere, Karnataka', state: 'Karnataka' },
  '57':  { lat: 12.9141, lng: 74.8560, area: 'South Karnataka', state: 'Karnataka' },
  '580': { lat: 15.3647, lng: 75.1240, area: 'Hubballi-Dharwad, Karnataka', state: 'Karnataka' },
  '581': { lat: 14.7950, lng: 74.6850, area: 'Uttara Kannada / Karwar, Karnataka', state: 'Karnataka' },
  '582': { lat: 15.4200, lng: 75.6300, area: 'Gadag, Karnataka', state: 'Karnataka' },
  '583': { lat: 15.1394, lng: 76.9214, area: 'Ballari / Vijayanagara, Karnataka', state: 'Karnataka' },
  '584': { lat: 16.2076, lng: 77.3463, area: 'Raichur, Karnataka', state: 'Karnataka' },
  '585': { lat: 17.3297, lng: 76.8343, area: 'Kalaburagi (Gulbarga), Karnataka', state: 'Karnataka' },
  '586': { lat: 16.8302, lng: 75.7100, area: 'Vijayapura (Bijapur), Karnataka', state: 'Karnataka' },
  '587': { lat: 16.1800, lng: 75.7000, area: 'Bagalkote, Karnataka', state: 'Karnataka' },
  '590': { lat: 15.8497, lng: 74.4977, area: 'Belagavi (Belgaum), Karnataka', state: 'Karnataka' },
  '591': { lat: 16.1000, lng: 74.8000, area: 'Belagavi District, Karnataka', state: 'Karnataka' },
  '58':  { lat: 15.3647, lng: 75.1240, area: 'North Karnataka', state: 'Karnataka' },
  '59':  { lat: 15.8497, lng: 74.4977, area: 'North Karnataka', state: 'Karnataka' },

  // --- Tamil Nadu & Puducherry (60xxxx - 64xxxx) ---
  '600': { lat: 13.0827, lng: 80.2707, area: 'Chennai, Tamil Nadu', state: 'Tamil Nadu' },
  '601': { lat: 13.1400, lng: 80.0000, area: 'Tiruvallur, Tamil Nadu', state: 'Tamil Nadu' },
  '602': { lat: 13.0000, lng: 79.9000, area: 'Kanchipuram, Tamil Nadu', state: 'Tamil Nadu' },
  '603': { lat: 12.6900, lng: 80.0000, area: 'Chengalpattu, Tamil Nadu', state: 'Tamil Nadu' },
  '605': { lat: 11.9416, lng: 79.8083, area: 'Puducherry / Cuddalore', state: 'Puducherry' },
  '60':  { lat: 13.0827, lng: 80.2707, area: 'Chennai Region, Tamil Nadu', state: 'Tamil Nadu' },
  '610': { lat: 10.7700, lng: 79.6300, area: 'Tiruvarur / Nagapattinam, Tamil Nadu', state: 'Tamil Nadu' },
  '613': { lat: 10.7870, lng: 79.1378, area: 'Thanjavur, Tamil Nadu', state: 'Tamil Nadu' },
  '620': { lat: 10.7905, lng: 78.7047, area: 'Tiruchirappalli (Trichy), Tamil Nadu', state: 'Tamil Nadu' },
  '625': { lat: 9.9252, lng: 78.1198, area: 'Madurai, Tamil Nadu', state: 'Tamil Nadu' },
  '627': { lat: 8.7139, lng: 77.7567, area: 'Tirunelveli, Tamil Nadu', state: 'Tamil Nadu' },
  '629': { lat: 8.1833, lng: 77.4119, area: 'Kanyakumari / Nagercoil, Tamil Nadu', state: 'Tamil Nadu' },
  '636': { lat: 11.6643, lng: 78.1460, area: 'Salem, Tamil Nadu', state: 'Tamil Nadu' },
  '632': { lat: 12.9165, lng: 79.1325, area: 'Vellore, Tamil Nadu', state: 'Tamil Nadu' },
  '641': { lat: 11.0168, lng: 76.9558, area: 'Coimbatore, Tamil Nadu', state: 'Tamil Nadu' },
  '638': { lat: 11.3410, lng: 77.7172, area: 'Erode, Tamil Nadu', state: 'Tamil Nadu' },
  '642': { lat: 11.1085, lng: 77.3411, area: 'Tiruppur, Tamil Nadu', state: 'Tamil Nadu' },
  '61':  { lat: 10.7905, lng: 78.7047, area: 'Central Tamil Nadu', state: 'Tamil Nadu' },
  '62':  { lat: 9.9252, lng: 78.1198, area: 'South Tamil Nadu', state: 'Tamil Nadu' },
  '63':  { lat: 11.6643, lng: 78.1460, area: 'North Tamil Nadu', state: 'Tamil Nadu' },
  '64':  { lat: 11.0168, lng: 76.9558, area: 'West Tamil Nadu', state: 'Tamil Nadu' },

  // --- Kerala (67xxxx - 69xxxx) ---
  '673': { lat: 11.2588, lng: 75.7804, area: 'Kozhikode (Calicut), Kerala', state: 'Kerala' },
  '670': { lat: 11.8745, lng: 75.3704, area: 'Kannur, Kerala', state: 'Kerala' },
  '676': { lat: 11.0510, lng: 76.0711, area: 'Malappuram, Kerala', state: 'Kerala' },
  '678': { lat: 10.7867, lng: 76.6548, area: 'Palakkad, Kerala', state: 'Kerala' },
  '680': { lat: 10.5276, lng: 76.2144, area: 'Thrissur, Kerala', state: 'Kerala' },
  '682': { lat: 9.9312, lng: 76.2673, area: 'Kochi / Ernakulam, Kerala', state: 'Kerala' },
  '686': { lat: 9.5916, lng: 76.5222, area: 'Kottayam, Kerala', state: 'Kerala' },
  '688': { lat: 9.4981, lng: 76.3388, area: 'Alappuzha, Kerala', state: 'Kerala' },
  '691': { lat: 8.8932, lng: 76.6141, area: 'Kollam, Kerala', state: 'Kerala' },
  '695': { lat: 8.5241, lng: 76.9366, area: 'Thiruvananthapuram, Kerala', state: 'Kerala' },
  '67':  { lat: 11.2588, lng: 75.7804, area: 'North Kerala', state: 'Kerala' },
  '68':  { lat: 9.9312, lng: 76.2673, area: 'Central Kerala', state: 'Kerala' },
  '69':  { lat: 8.5241, lng: 76.9366, area: 'South Kerala', state: 'Kerala' },

  // --- Maharashtra & Goa (40xxxx - 44xxxx) ---
  '400': { lat: 19.0760, lng: 72.8777, area: 'Mumbai, Maharashtra', state: 'Maharashtra' },
  '401': { lat: 19.4500, lng: 72.8000, area: 'Palghar / Vasai-Virar, Maharashtra', state: 'Maharashtra' },
  '403': { lat: 15.4909, lng: 73.8278, area: 'Goa', state: 'Goa' },
  '411': { lat: 18.5204, lng: 73.8567, area: 'Pune, Maharashtra', state: 'Maharashtra' },
  '413': { lat: 17.6599, lng: 75.9064, area: 'Solapur, Maharashtra', state: 'Maharashtra' },
  '416': { lat: 16.7050, lng: 74.2433, area: 'Kolhapur, Maharashtra', state: 'Maharashtra' },
  '422': { lat: 19.9975, lng: 73.7898, area: 'Nashik, Maharashtra', state: 'Maharashtra' },
  '424': { lat: 20.9042, lng: 74.7749, area: 'Dhule, Maharashtra', state: 'Maharashtra' },
  '425': { lat: 21.0077, lng: 75.5626, area: 'Jalgaon, Maharashtra', state: 'Maharashtra' },
  '431': { lat: 19.8762, lng: 75.3433, area: 'Chhatrapati Sambhajinagar (Aurangabad), Maharashtra', state: 'Maharashtra' },
  '440': { lat: 21.1458, lng: 79.0882, area: 'Nagpur, Maharashtra', state: 'Maharashtra' },
  '444': { lat: 20.9374, lng: 77.7796, area: 'Amravati, Maharashtra', state: 'Maharashtra' },
  '40':  { lat: 19.0760, lng: 72.8777, area: 'Mumbai Region, Maharashtra', state: 'Maharashtra' },
  '41':  { lat: 18.5204, lng: 73.8567, area: 'Western Maharashtra', state: 'Maharashtra' },
  '42':  { lat: 19.9975, lng: 73.7898, area: 'North Maharashtra', state: 'Maharashtra' },
  '43':  { lat: 19.8762, lng: 75.3433, area: 'Marathwada, Maharashtra', state: 'Maharashtra' },
  '44':  { lat: 21.1458, lng: 79.0882, area: 'Vidarbha, Maharashtra', state: 'Maharashtra' },

  // --- Gujarat (36xxxx - 39xxxx) ---
  '380': { lat: 23.0225, lng: 72.5714, area: 'Ahmedabad, Gujarat', state: 'Gujarat' },
  '382': { lat: 23.2156, lng: 72.6369, area: 'Gandhinagar, Gujarat', state: 'Gujarat' },
  '390': { lat: 22.3072, lng: 73.1812, area: 'Vadodara, Gujarat', state: 'Gujarat' },
  '395': { lat: 21.1702, lng: 72.8311, area: 'Surat, Gujarat', state: 'Gujarat' },
  '360': { lat: 22.3039, lng: 70.8022, area: 'Rajkot, Gujarat', state: 'Gujarat' },
  '361': { lat: 22.4707, lng: 70.0577, area: 'Jamnagar, Gujarat', state: 'Gujarat' },
  '362': { lat: 21.5222, lng: 70.4579, area: 'Junagadh, Gujarat', state: 'Gujarat' },
  '364': { lat: 21.7645, lng: 72.1519, area: 'Bhavnagar, Gujarat', state: 'Gujarat' },
  '370': { lat: 23.2420, lng: 69.6669, area: 'Bhuj / Kutch, Gujarat', state: 'Gujarat' },
  '38':  { lat: 23.0225, lng: 72.5714, area: 'Ahmedabad Region, Gujarat', state: 'Gujarat' },
  '39':  { lat: 21.1702, lng: 72.8311, area: 'South Gujarat', state: 'Gujarat' },
  '36':  { lat: 22.3039, lng: 70.8022, area: 'Saurashtra, Gujarat', state: 'Gujarat' },
  '37':  { lat: 23.2420, lng: 69.6669, area: 'Kutch, Gujarat', state: 'Gujarat' },

  // --- Rajasthan (30xxxx - 34xxxx) ---
  '302': { lat: 26.9124, lng: 75.7873, area: 'Jaipur, Rajasthan', state: 'Rajasthan' },
  '305': { lat: 26.4499, lng: 74.6399, area: 'Ajmer, Rajasthan', state: 'Rajasthan' },
  '313': { lat: 24.5854, lng: 73.7125, area: 'Udaipur, Rajasthan', state: 'Rajasthan' },
  '324': { lat: 25.2138, lng: 75.8648, area: 'Kota, Rajasthan', state: 'Rajasthan' },
  '334': { lat: 28.0229, lng: 73.3119, area: 'Bikaner, Rajasthan', state: 'Rajasthan' },
  '342': { lat: 26.2389, lng: 73.0243, area: 'Jodhpur, Rajasthan', state: 'Rajasthan' },
  '30':  { lat: 26.9124, lng: 75.7873, area: 'Jaipur Region, Rajasthan', state: 'Rajasthan' },
  '31':  { lat: 24.5854, lng: 73.7125, area: 'South Rajasthan', state: 'Rajasthan' },
  '32':  { lat: 25.2138, lng: 75.8648, area: 'Hadoti, Rajasthan', state: 'Rajasthan' },
  '33':  { lat: 28.0229, lng: 73.3119, area: 'North Rajasthan', state: 'Rajasthan' },
  '34':  { lat: 26.2389, lng: 73.0243, area: 'Marwar, Rajasthan', state: 'Rajasthan' },

  // --- Madhya Pradesh & Chhattisgarh (45xxxx - 49xxxx) ---
  '452': { lat: 22.7196, lng: 75.8577, area: 'Indore, Madhya Pradesh', state: 'Madhya Pradesh' },
  '456': { lat: 23.1765, lng: 75.7885, area: 'Ujjain, Madhya Pradesh', state: 'Madhya Pradesh' },
  '462': { lat: 23.2599, lng: 77.4126, area: 'Bhopal, Madhya Pradesh', state: 'Madhya Pradesh' },
  '474': { lat: 26.2183, lng: 78.1828, area: 'Gwalior, Madhya Pradesh', state: 'Madhya Pradesh' },
  '482': { lat: 23.1815, lng: 79.9864, area: 'Jabalpur, Madhya Pradesh', state: 'Madhya Pradesh' },
  '492': { lat: 21.2514, lng: 81.6296, area: 'Raipur, Chhattisgarh', state: 'Chhattisgarh' },
  '490': { lat: 21.2167, lng: 81.3833, area: 'Durg / Bhilai, Chhattisgarh', state: 'Chhattisgarh' },
  '495': { lat: 22.0797, lng: 82.1409, area: 'Bilaspur, Chhattisgarh', state: 'Chhattisgarh' },
  '45':  { lat: 22.7196, lng: 75.8577, area: 'Malwa, Madhya Pradesh', state: 'Madhya Pradesh' },
  '46':  { lat: 23.2599, lng: 77.4126, area: 'Central Madhya Pradesh', state: 'Madhya Pradesh' },
  '47':  { lat: 26.2183, lng: 78.1828, area: 'North Madhya Pradesh', state: 'Madhya Pradesh' },
  '48':  { lat: 23.1815, lng: 79.9864, area: 'East Madhya Pradesh', state: 'Madhya Pradesh' },
  '49':  { lat: 21.2514, lng: 81.6296, area: 'Chhattisgarh', state: 'Chhattisgarh' },

  // --- West Bengal, Odisha, North East (70xxxx - 79xxxx) ---
  '700': { lat: 22.5726, lng: 88.3639, area: 'Kolkata, West Bengal', state: 'West Bengal' },
  '711': { lat: 22.5958, lng: 88.2636, area: 'Howrah, West Bengal', state: 'West Bengal' },
  '713': { lat: 23.5204, lng: 87.3119, area: 'Durgapur / Asansol, West Bengal', state: 'West Bengal' },
  '734': { lat: 26.7271, lng: 88.3953, area: 'Siliguri / Darjeeling, West Bengal', state: 'West Bengal' },
  '737': { lat: 27.3389, lng: 88.6065, area: 'Gangtok, Sikkim', state: 'Sikkim' },
  '751': { lat: 20.2961, lng: 85.8245, area: 'Bhubaneswar, Odisha', state: 'Odisha' },
  '753': { lat: 20.4625, lng: 85.8830, area: 'Cuttack, Odisha', state: 'Odisha' },
  '769': { lat: 22.2604, lng: 84.8536, area: 'Rourkela, Odisha', state: 'Odisha' },
  '781': { lat: 26.1445, lng: 91.7362, area: 'Guwahati, Assam', state: 'Assam' },
  '793': { lat: 25.5788, lng: 91.8933, area: 'Shillong, Meghalaya', state: 'Meghalaya' },
  '795': { lat: 24.8170, lng: 93.9368, area: 'Imphal, Manipur', state: 'Manipur' },
  '796': { lat: 23.7271, lng: 92.7176, area: 'Aizawl, Mizoram', state: 'Mizoram' },
  '797': { lat: 25.6751, lng: 94.1086, area: 'Kohima, Nagaland', state: 'Nagaland' },
  '799': { lat: 23.8315, lng: 91.2868, area: 'Agartala, Tripura', state: 'Tripura' },
  '70':  { lat: 22.5726, lng: 88.3639, area: 'Kolkata Region, West Bengal', state: 'West Bengal' },
  '71':  { lat: 22.5958, lng: 88.2636, area: 'South Bengal', state: 'West Bengal' },
  '72':  { lat: 22.4257, lng: 87.3199, area: 'South-West Bengal', state: 'West Bengal' },
  '73':  { lat: 26.7271, lng: 88.3953, area: 'North Bengal / Sikkim', state: 'West Bengal' },
  '74':  { lat: 24.1750, lng: 88.2802, area: 'Central Bengal', state: 'West Bengal' },
  '75':  { lat: 20.2961, lng: 85.8245, area: 'Odisha Coast', state: 'Odisha' },
  '76':  { lat: 19.3149, lng: 84.7941, area: 'South Odisha', state: 'Odisha' },
  '77':  { lat: 22.2604, lng: 84.8536, area: 'North Odisha', state: 'Odisha' },
  '78':  { lat: 26.1445, lng: 91.7362, area: 'Assam', state: 'Assam' },
  '79':  { lat: 25.5788, lng: 91.8933, area: 'North East India', state: 'North East' },

  // --- Bihar & Jharkhand (80xxxx - 85xxxx) ---
  '800': { lat: 25.5941, lng: 85.1376, area: 'Patna, Bihar', state: 'Bihar' },
  '812': { lat: 25.2425, lng: 86.9842, area: 'Bhagalpur, Bihar', state: 'Bihar' },
  '823': { lat: 24.7914, lng: 85.0002, area: 'Gaya, Bihar', state: 'Bihar' },
  '826': { lat: 23.7957, lng: 86.4304, area: 'Dhanbad, Jharkhand', state: 'Jharkhand' },
  '831': { lat: 22.8046, lng: 86.2029, area: 'Jamshedpur, Jharkhand', state: 'Jharkhand' },
  '834': { lat: 23.3441, lng: 85.3096, area: 'Ranchi, Jharkhand', state: 'Jharkhand' },
  '842': { lat: 26.1209, lng: 85.3647, area: 'Muzaffarpur, Bihar', state: 'Bihar' },
  '854': { lat: 25.7771, lng: 87.4753, area: 'Purnia, Bihar', state: 'Bihar' },
  '80':  { lat: 25.5941, lng: 85.1376, area: 'Patna Region, Bihar', state: 'Bihar' },
  '81':  { lat: 25.2425, lng: 86.9842, area: 'East Bihar', state: 'Bihar' },
  '82':  { lat: 24.7914, lng: 85.0002, area: 'South Bihar / Jharkhand', state: 'Bihar' },
  '83':  { lat: 23.3441, lng: 85.3096, area: 'Jharkhand', state: 'Jharkhand' },
  '84':  { lat: 26.1209, lng: 85.3647, area: 'North Bihar', state: 'Bihar' },
  '85':  { lat: 25.7771, lng: 87.4753, area: 'North-East Bihar', state: 'Bihar' },

  // --- Delhi NCR & North India (11xxxx - 28xxxx) ---
  '110009': { lat: 28.7095, lng: 77.2075, area: 'Mukherjee Nagar / GTB Nagar, Delhi', state: 'Delhi' },
  '110001': { lat: 28.6139, lng: 77.2090, area: 'Connaught Place, Central Delhi', state: 'Delhi' },
  '110007': { lat: 28.6850, lng: 77.2100, area: 'Delhi University, North Delhi', state: 'Delhi' },
  '110016': { lat: 28.5494, lng: 77.1950, area: 'Hauz Khas, South Delhi', state: 'Delhi' },
  '110019': { lat: 28.5480, lng: 77.2510, area: 'Kalkaji / Nehru Place, South Delhi', state: 'Delhi' },
  '110025': { lat: 28.5610, lng: 77.2840, area: 'Okhla, South Delhi', state: 'Delhi' },
  '110034': { lat: 28.6990, lng: 77.1320, area: 'Pitampura, North-West Delhi', state: 'Delhi' },
  '110075': { lat: 28.5921, lng: 77.0460, area: 'Dwarka, South-West Delhi', state: 'Delhi' },
  '110085': { lat: 28.7166, lng: 77.1133, area: 'Rohini, North-West Delhi', state: 'Delhi' },
  '110092': { lat: 28.6300, lng: 77.2780, area: 'Laxmi Nagar, East Delhi', state: 'Delhi' },
  '11': { lat: 28.6139, lng: 77.2090, area: 'Delhi', state: 'Delhi' },
  '121': { lat: 28.4089, lng: 77.3178, area: 'Faridabad, Haryana', state: 'Haryana' },
  '122': { lat: 28.4595, lng: 77.0266, area: 'Gurugram, Haryana', state: 'Haryana' },
  '12':  { lat: 28.4595, lng: 77.0266, area: 'South Haryana', state: 'Haryana' },
  '133': { lat: 30.3782, lng: 76.7767, area: 'Ambala, Haryana', state: 'Haryana' },
  '132': { lat: 29.6857, lng: 76.9905, area: 'Karnal, Haryana', state: 'Haryana' },
  '13':  { lat: 29.6857, lng: 76.9905, area: 'North Haryana', state: 'Haryana' },
  '141': { lat: 30.9010, lng: 75.8573, area: 'Ludhiana, Punjab', state: 'Punjab' },
  '143': { lat: 31.6340, lng: 74.8723, area: 'Amritsar, Punjab', state: 'Punjab' },
  '144': { lat: 31.3260, lng: 75.5762, area: 'Jalandhar, Punjab', state: 'Punjab' },
  '14':  { lat: 30.9010, lng: 75.8573, area: 'East Punjab', state: 'Punjab' },
  '151': { lat: 30.2110, lng: 74.9455, area: 'Bathinda, Punjab', state: 'Punjab' },
  '15':  { lat: 30.2110, lng: 74.9455, area: 'West Punjab', state: 'Punjab' },
  '160': { lat: 30.7333, lng: 76.7794, area: 'Chandigarh', state: 'Chandigarh' },
  '16':  { lat: 30.7333, lng: 76.7794, area: 'Chandigarh Tri-city', state: 'Chandigarh' },
  '171': { lat: 31.1048, lng: 77.1734, area: 'Shimla, Himachal Pradesh', state: 'Himachal Pradesh' },
  '17':  { lat: 31.1048, lng: 77.1734, area: 'Himachal Pradesh', state: 'Himachal Pradesh' },
  '180': { lat: 32.7266, lng: 74.8570, area: 'Jammu, J&K', state: 'Jammu and Kashmir' },
  '18':  { lat: 32.7266, lng: 74.8570, area: 'Jammu Region', state: 'Jammu and Kashmir' },
  '190': { lat: 34.0837, lng: 74.7973, area: 'Srinagar, J&K', state: 'Jammu and Kashmir' },
  '19':  { lat: 34.0837, lng: 74.7973, area: 'Kashmir Region', state: 'Jammu and Kashmir' },
  '2010': { lat: 28.6692, lng: 77.4538, area: 'Ghaziabad, Uttar Pradesh', state: 'Uttar Pradesh' },
  '201306': { lat: 28.4744, lng: 77.5040, area: 'Greater Noida (Pari Chowk), Uttar Pradesh', state: 'Uttar Pradesh' },
  '201308': { lat: 28.4720, lng: 77.5110, area: 'Greater Noida (Alpha/Beta), Uttar Pradesh', state: 'Uttar Pradesh' },
  '201310': { lat: 28.4980, lng: 77.4950, area: 'Greater Noida (Knowledge Park), Uttar Pradesh', state: 'Uttar Pradesh' },
  '201318': { lat: 28.4600, lng: 77.5200, area: 'Greater Noida (Techzone), Uttar Pradesh', state: 'Uttar Pradesh' },
  '201305': { lat: 28.5950, lng: 77.4350, area: 'Greater Noida West / Noida Extension, Uttar Pradesh', state: 'Uttar Pradesh' },
  '201301': { lat: 28.5355, lng: 77.3910, area: 'Central Noida, Uttar Pradesh', state: 'Uttar Pradesh' },
  '201304': { lat: 28.5355, lng: 77.3910, area: 'Noida Sector 50/76, Uttar Pradesh', state: 'Uttar Pradesh' },
  '201307': { lat: 28.5355, lng: 77.3910, area: 'Noida Sector 62, Uttar Pradesh', state: 'Uttar Pradesh' },
  '201309': { lat: 28.5100, lng: 77.4000, area: 'Noida Expressway, Uttar Pradesh', state: 'Uttar Pradesh' },
  '201313': { lat: 28.5000, lng: 77.4100, area: 'Noida Sector 137, Uttar Pradesh', state: 'Uttar Pradesh' },
  '2013':   { lat: 28.5355, lng: 77.3910, area: 'Noida, Uttar Pradesh', state: 'Uttar Pradesh' },
  '201':    { lat: 28.6692, lng: 77.4538, area: 'Ghaziabad, Uttar Pradesh', state: 'Uttar Pradesh' },
  '202': { lat: 27.8974, lng: 78.0880, area: 'Aligarh, Uttar Pradesh', state: 'Uttar Pradesh' },
  '208': { lat: 26.4499, lng: 80.3319, area: 'Kanpur, Uttar Pradesh', state: 'Uttar Pradesh' },
  '211': { lat: 25.4358, lng: 81.8463, area: 'Prayagraj, Uttar Pradesh', state: 'Uttar Pradesh' },
  '221': { lat: 25.3176, lng: 82.9739, area: 'Varanasi, Uttar Pradesh', state: 'Uttar Pradesh' },
  '226': { lat: 26.8467, lng: 80.9462, area: 'Lucknow, Uttar Pradesh', state: 'Uttar Pradesh' },
  '248': { lat: 30.3165, lng: 78.0322, area: 'Dehradun, Uttarakhand', state: 'Uttarakhand' },
  '250': { lat: 28.9845, lng: 77.7064, area: 'Meerut, Uttar Pradesh', state: 'Uttar Pradesh' },
  '273': { lat: 26.7606, lng: 83.3732, area: 'Gorakhpur, Uttar Pradesh', state: 'Uttar Pradesh' },
  '282': { lat: 27.1767, lng: 78.0081, area: 'Agra, Uttar Pradesh', state: 'Uttar Pradesh' },
  '20':  { lat: 28.6692, lng: 77.4538, area: 'Western UP', state: 'Uttar Pradesh' },
  '21':  { lat: 25.4358, lng: 81.8463, area: 'Central UP', state: 'Uttar Pradesh' },
  '22':  { lat: 26.8467, lng: 80.9462, area: 'East UP', state: 'Uttar Pradesh' },
  '24':  { lat: 30.3165, lng: 78.0322, area: 'Uttarakhand', state: 'Uttarakhand' },
  '25':  { lat: 28.9845, lng: 77.7064, area: 'Upper Doab, UP', state: 'Uttar Pradesh' },
  '26':  { lat: 29.3919, lng: 79.4542, area: 'Kumaon, Uttarakhand', state: 'Uttarakhand' },
  '27':  { lat: 26.7606, lng: 83.3732, area: 'North-East UP', state: 'Uttar Pradesh' },
  '28':  { lat: 27.1767, lng: 78.0081, area: 'Braj / Bundelkhand, UP', state: 'Uttar Pradesh' }
};

const STATE_AND_CITY_NAME_MAP = [
  // Andhra Pradesh (explicit variations: andra, andhra, ap, anantapur, vijayawada, vizag, etc.)
  { names: ['andra pradesh', 'andhra pradesh', 'anantapur', 'anantapuram', 'vijayawada', 'visakhapatnam', 'vizag', 'tirupati', 'kurnool', 'guntur', 'kadapa', 'kakinada', 'rajahmundry', 'nellore', 'eluru', 'ongole', 'chittoor', 'srikakulam', 'vizianagaram', 'rayalaseema', 'amaravati'], lat: 14.6819, lng: 77.6006, area: 'Andhra Pradesh' },
  { names: ['telangana', 'hyderabad', 'secunderabad', 'warangal', 'nizamabad', 'karimnagar'], lat: 17.3850, lng: 78.4867, area: 'Telangana' },
  { names: ['karnataka', 'bengaluru', 'bangalore', 'mysore', 'mysuru', 'mangalore', 'mangaluru', 'hubli', 'dharwad', 'belgaum', 'belagavi', 'kalaburagi', 'gulbarga'], lat: 12.9716, lng: 77.5946, area: 'Karnataka' },
  { names: ['tamil nadu', 'tamilnadu', 'chennai', 'madras', 'coimbatore', 'madurai', 'trichy', 'tiruchirappalli', 'salem', 'tiruppur', 'vellore'], lat: 13.0827, lng: 80.2707, area: 'Tamil Nadu' },
  { names: ['kerala', 'kochi', 'cochin', 'thiruvananthapuram', 'trivandrum', 'kozhikode', 'calicut', 'thrissur', 'kollam', 'palakkad', 'alappuzha', 'kannur'], lat: 9.9312, lng: 76.2673, area: 'Kerala' },
  { names: ['maharashtra', 'mumbai', 'bombay', 'pune', 'nagpur', 'nashik', 'aurangabad', 'solapur', 'kolhapur', 'amravati', 'navi mumbai', 'thane'], lat: 19.0760, lng: 72.8777, area: 'Maharashtra' },
  { names: ['goa', 'panaji', 'margao', 'vasco da gama'], lat: 15.4909, lng: 73.8278, area: 'Goa' },
  { names: ['gujarat', 'ahmedabad', 'surat', 'vadodara', 'baroda', 'rajkot', 'bhavnagar', 'jamnagar', 'gandhinagar', 'junagadh'], lat: 23.0225, lng: 72.5714, area: 'Gujarat' },
  { names: ['rajasthan', 'jaipur', 'jodhpur', 'kota', 'bikaner', 'ajmer', 'udaipur', 'bhilwara'], lat: 26.9124, lng: 75.7873, area: 'Rajasthan' },
  { names: ['madhya pradesh', 'indore', 'bhopal', 'jabalpur', 'gwalior', 'ujjain', 'sagar'], lat: 23.2599, lng: 77.4126, area: 'Madhya Pradesh' },
  { names: ['chhattisgarh', 'raipur', 'bhilai', 'bilaspur', 'korba', 'durg'], lat: 21.2514, lng: 81.6296, area: 'Chhattisgarh' },
  { names: ['odisha', 'orissa', 'bhubaneswar', 'cuttack', 'rourkela', 'berhampur', 'sambalpur', 'puri'], lat: 20.2961, lng: 85.8245, area: 'Odisha' },
  { names: ['west bengal', 'kolkata', 'calcutta', 'howrah', 'durgapur', 'asansol', 'siliguri'], lat: 22.5726, lng: 88.3639, area: 'West Bengal' },
  { names: ['bihar', 'patna', 'gaya', 'bhagalpur', 'muzaffarpur', 'purnia', 'darbhanga'], lat: 25.5941, lng: 85.1376, area: 'Bihar' },
  { names: ['jharkhand', 'ranchi', 'jamshedpur', 'dhanbad', 'bokaro'], lat: 23.3441, lng: 85.3096, area: 'Jharkhand' },
  { names: ['uttarakhand', 'dehradun', 'haridwar', 'roorkee', 'haldwani', 'rudrapur', 'rishikesh'], lat: 30.3165, lng: 78.0322, area: 'Uttarakhand' },
  { names: ['punjab', 'ludhiana', 'amritsar', 'jalandhar', 'patiala', 'bathinda', 'mohali'], lat: 30.9010, lng: 75.8573, area: 'Punjab' },
  { names: ['haryana', 'gurugram', 'gurgaon', 'faridabad', 'panipat', 'ambala', 'yamunanagar', 'rohtak', 'hisar', 'karnal'], lat: 28.4595, lng: 77.0266, area: 'Haryana' },
  { names: ['himachal pradesh', 'shimla', 'dharamshala', 'solan', 'mandi', 'kullu', 'manali'], lat: 31.1048, lng: 77.1734, area: 'Himachal Pradesh' },
  { names: ['jammu and kashmir', 'jammu', 'srinagar', 'anantnag', 'baramulla', 'udhampur', 'ladakh', 'leh'], lat: 34.0837, lng: 74.7973, area: 'Jammu & Kashmir' },
  { names: ['assam', 'guwahati', 'silchar', 'dibrugarh', 'jorhat', 'nagaon'], lat: 26.1445, lng: 91.7362, area: 'Assam' },
  { names: ['tripura', 'agartala'], lat: 23.8315, lng: 91.2868, area: 'Tripura' },
  { names: ['meghalaya', 'shillong'], lat: 25.5788, lng: 91.8933, area: 'Meghalaya' },
  { names: ['manipur', 'imphal'], lat: 24.8170, lng: 93.9368, area: 'Manipur' },
  { names: ['nagaland', 'kohima', 'dimapur'], lat: 25.6751, lng: 94.1086, area: 'Nagaland' },
  { names: ['mizoram', 'aizawl'], lat: 23.7271, lng: 92.7176, area: 'Mizoram' },
  { names: ['sikkim', 'gangtok'], lat: 27.3389, lng: 88.6065, area: 'Sikkim' },
  { names: ['arunachal pradesh', 'itanagar'], lat: 27.0844, lng: 93.6053, area: 'Arunachal Pradesh' },
  { names: ['chandigarh'], lat: 30.7333, lng: 76.7794, area: 'Chandigarh' },
  { names: ['ghaziabad', 'indirapuram', 'vaishali', 'raj nagar'], lat: 28.6692, lng: 77.4538, area: 'Ghaziabad' },
  { names: ['greater noida', 'gr noida', 'pari chowk', 'knowledge park', 'surajpur', 'greater noida west', 'noida extension', 'gaur city', 'kasna'], lat: 28.4744, lng: 77.5040, area: 'Greater Noida' },
  { names: ['noida', 'sector 62', 'sector 18', 'sector 15', 'sector 16', 'sector 37', 'sector 50', 'sector 76', 'sector 137', 'sector 128', 'botanical garden', 'noida expressway', 'atta market', 'film city noida', 'gautam buddha nagar'], lat: 28.5355, lng: 77.3910, area: 'Noida' },
  { names: ['uttar pradesh', 'lucknow', 'kanpur', 'varanasi', 'banaras', 'agra', 'prayagraj', 'allahabad', 'meerut', 'bareilly', 'aligarh', 'moradabad', 'gorakhpur', 'firozabad', 'jhansi', 'muzaffarnagar', 'mathura', 'ayodhya'], lat: 26.8467, lng: 80.9462, area: 'Uttar Pradesh' },
  { names: ['mukherjee nagar', 'gtb nagar', 'hudson lane', 'kingsway camp'], lat: 28.7095, lng: 77.2075, area: 'Mukherjee Nagar' },
  { names: ['vishwavidyalaya', 'vishwavidyalaya metro', 'delhi university', 'north campus', 'mall road delhi', 'chhatra marg', 'kamla nagar', 'roop nagar', 'malka ganj', 'civil lines delhi'], lat: 28.6947, lng: 77.2140, area: 'Vishwavidyalaya, North Campus' },
  { names: ['model town'], lat: 28.7150, lng: 77.1900, area: 'Model Town' },
  { names: ['connaught place', 'cp', 'new delhi', 'delhi'], lat: 28.6139, lng: 77.2090, area: 'Delhi' }
];

/**
 * Resolves any Indian address string or pincode into geographic coordinates.
 * @param {string} text - Combined address text (House, Street, Landmark, Pincode, State)
 * @param {object|null} fallbackCoords - Optional GPS coordinates if already acquired
 * @returns {object} { lat, lng, area, pincode, isResolved }
 */
function resolveIndianAddressCoordinates(text, fallbackCoords = null) {
  const lower = (text || '').toLowerCase().trim();
  if (!lower) {
    if (fallbackCoords && typeof fallbackCoords.lat === 'number' && typeof fallbackCoords.lng === 'number') {
      return {
        lat: fallbackCoords.lat,
        lng: fallbackCoords.lng,
        area: fallbackCoords.area || 'Current Location',
        pincode: fallbackCoords.pincode || '',
        isResolved: true
      };
    }
    return { lat: null, lng: null, area: 'Unknown Location', pincode: '', isResolved: false };
  }

  // 1. PIN code pattern matching (6 digits)
  const pinMatch = lower.match(/\b([1-9][0-9]{5})\b/);
  if (pinMatch) {
    const pin = pinMatch[1];
    const prefixes = [pin, pin.slice(0, 4), pin.slice(0, 3), pin.slice(0, 2)];
    for (const pref of prefixes) {
      if (PINCODE_PREFIX_MAP[pref]) {
        const found = PINCODE_PREFIX_MAP[pref];
        return {
          lat: found.lat,
          lng: found.lng,
          area: found.area,
          pincode: pin,
          isResolved: true
        };
      }
    }
  }

  // 2. City & State name matching
  for (const entry of STATE_AND_CITY_NAME_MAP) {
    if (entry.names.some(n => lower.includes(n))) {
      return {
        lat: entry.lat,
        lng: entry.lng,
        area: entry.area,
        pincode: pinMatch ? pinMatch[1] : '',
        isResolved: true
      };
    }
  }

  // 3. Fallback to active live GPS coordinates if available
  if (fallbackCoords && typeof fallbackCoords.lat === 'number' && typeof fallbackCoords.lng === 'number') {
    return {
      lat: fallbackCoords.lat,
      lng: fallbackCoords.lng,
      area: fallbackCoords.area || 'Current Location',
      pincode: pinMatch ? pinMatch[1] : '',
      isResolved: true
    };
  }

  // 4. Truly unrecognized location: Return null coordinates (never default to Delhi)
  return {
    lat: null,
    lng: null,
    area: 'Unknown Location',
    pincode: pinMatch ? pinMatch[1] : '',
    isResolved: false
  };
}

  return {
    PINCODE_PREFIX_MAP,
    STATE_AND_CITY_NAME_MAP,
    resolveIndianAddressCoordinates
  };
}));
