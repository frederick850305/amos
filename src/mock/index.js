import { reactive, computed } from 'vue'
import { session } from '../store/session.js'

// ============================================================
// Neusoft M&P 原型 Mock 数据库（纯前端，内存态）
// 字段命名尽量贴合 amos_prototype.md 第 10 章数据模型
// ============================================================

let _id = 1000
export const uid = (p = 'id') => `${p}_${++_id}`

// 手册 P44-45：主发动机 + 10 个活塞的计数器依赖示例。
// 活塞的 RUN-HRS 计数器 dependsOn = C-10001（主机），更新主机读数后级联同步到全部活塞。
// 预置主机当前读数 78200，活塞继承同一读数，开箱即可看到依赖关系。
const pistonComponents = Array.from({ length: 10 }, (_, i) => {
  const n = String(i + 1).padStart(3, '0')
  return {
    id: uid('co'),
    number: `PIS.001.${n}`,
    typeNumber: 'CT-1003',
    name: 'Piston & rod for ME',
    status: 'In Use',
    maker: 'WART',
    type: 'Piston',
    serialNo: `10000${45 + i}`,
    location: 'Engine Room',
    department: 'Engine Room',
    parentComponent: 'C-10001',
    vendor: 'Wärtsilä Marine',
    functionNo: '',
    installDate: '2023-04-12',
    componentCounters: [
      { code: 'RUN-HRS', description: 'Running Hours', unit: 'hrs', startValue: 0, currentValue: 78200, latestZeroedDate: '2023-04-12', average: 0, calculate: 'No', dependsOn: 'C-10001' },
    ],
  }
})

// ===== 多船数据工厂 =====
// FN：生成功能位置（Function / SFI），填充手册要求的字段，o 可覆盖任意项。
function FN(o) {
  return Object.assign({
    id: uid('fn'), reference: '', parentFunctionNo: '', status: 'In Use',
    location: 'Engine Room', department: 'Engine Room', installedComponentId: '',
    criticality: 'Medium', counter: '', sfiCode: '', system: '', subSystem: '',
    remarks: '', serialNo: '', maker: '', model: '', tagNo: '',
    assetValue: 0, acquisitionDate: '', currency: 'USD', depreciation: 0,
    functionCounters: [], rotationLog: [],
  }, o)
}
// CO：生成设备实例（Component），o 可覆盖任意项。
function CO(o) {
  return Object.assign({
    id: uid('co'), status: 'Available', maker: '', type: '', serialNo: '',
    location: '', department: 'Engine Room', parentComponent: '', vendor: '',
    functionNo: '', installDate: '', componentCounters: [],
  }, o)
}

export const db = reactive({
  // 部件类型：全船队（Fleet）共享的模板，统一定义同类设备的作业 / 备件 / 计数器 / 测点。
  // 既有 4 个类型保留，并扩充至 15 个覆盖船舶各系统的真实设备类型。
  // 字段对齐手册 P36 General（Number/Name/Maker/Type/Preferred Vendor/Parent/Component Class）和 Details（Model/Status/Description/Dates）
  componentTypes: [
    { id: uid('ct'), typeNumber: 'CT-1001', name: 'Main Engine Cylinder Liner', maker: 'WART', model: 'RT-flex', type: 'Liner', classCode: 'ENG', compTypeModel: 'RT-flex82T', status: 'Active', preferredVendor: 'Wärtsilä Marine', parentTypeNumber: '', description: 'Main Engine cylinder liner assembly for low-speed 2-stroke engines', dateCreated: '2022-01-15', dateModified: '2024-06-10', jobs: 4, counters: [
        { code: 'RUN-HRS', description: 'Running Hours', unit: 'hrs', dependsOn: '' },
        { code: 'CYCLES', description: 'Start Cycles', unit: 'cycles', dependsOn: '' },
      ], measurePointDefs: [
        { code: 'TEMP-OUT', description: 'Exhaust Temp Outlet', trend: 'Stable', unit: '°C' },
      ], parts: [
        { stockTypeNo: 'ST-101', alternativeNo: '601.03.00.001', name: 'Cylinder liner, Part 01', makersRef: '1698466' },
        { stockTypeNo: 'ST-102', alternativeNo: '601.03.00.002', name: 'Cylinder liner, Part 02', makersRef: '79613003' },
        { stockTypeNo: 'ST-103', alternativeNo: '601.03.00.003', name: 'Cylinder liner, Part 03', makersRef: '87971491' },
      ], relatedTypes: [] },
    { id: uid('ct'), typeNumber: 'CT-1002', name: 'Auxiliary Boiler', maker: 'AALB', model: 'MISSION', type: 'Boiler', classCode: 'BOI', compTypeModel: 'MISSION OC-MI', status: 'Active', preferredVendor: 'Aalborg Industries', parentTypeNumber: '', description: 'Composite boiler for auxiliary steam supply and cargo heating', dateCreated: '2022-03-20', dateModified: '2024-05-18', jobs: 5, counters: [
        { code: 'FIRE-HRS', description: 'Fired Hours', unit: 'hrs', dependsOn: '' },
      ], measurePointDefs: [
        { code: 'PRESSURE', description: 'Working Pressure', trend: 'Stable', unit: 'bar' },
        { code: 'FLUE-TEMP', description: 'Flue Gas Temp', trend: 'Up', unit: '°C' },
        { code: 'WATER-LEVEL', description: 'Water Level', trend: 'Stable', unit: 'mm' },
      ], parts: [
        { stockTypeNo: 'ST-201', alternativeNo: '602.01.00.001' },
        { stockTypeNo: 'ST-202', alternativeNo: '' },
        { stockTypeNo: 'ST-203', alternativeNo: '602.03.00.001' },
      ], relatedTypes: [] },
    { id: uid('ct'), typeNumber: 'CT-2001', name: 'Centrifugal Pump', maker: 'GRUN', model: 'NB', type: 'Pump', classCode: 'PMP', compTypeModel: 'NBG 200-180-315', status: 'Active', preferredVendor: 'Grundfos', parentTypeNumber: '', description: 'Standard centrifugal pump for cooling water and ballast service', dateCreated: '2022-04-10', dateModified: '2024-03-22', jobs: 3, counters: [
        { code: 'PUMP-HRS', description: 'Pump Running Hours', unit: 'hrs', dependsOn: '' },
      ], measurePointDefs: [], parts: [
        { stockTypeNo: 'ST-301', alternativeNo: '603.01.00.001' },
        { stockTypeNo: 'ST-302', alternativeNo: '' },
        { stockTypeNo: 'ST-303', alternativeNo: '' },
      ], relatedTypes: [] },
    { id: uid('ct'), typeNumber: 'CT-3001', name: 'Sea Water Valve', maker: 'TYCO', model: 'V-900', type: 'Valve', classCode: 'VAL', compTypeModel: 'V-900 DN200', status: 'Obsolete', preferredVendor: 'Tyco International', parentTypeNumber: '', description: 'Sea water inlet/outlet butterfly valve — superseded by CT-3501', dateCreated: '2019-08-05', dateModified: '2023-11-30', jobs: 2, counters: [], measurePointDefs: [], parts: [
        { stockTypeNo: 'ST-401', alternativeNo: '' },
        { stockTypeNo: 'ST-402', alternativeNo: '' },
        { stockTypeNo: 'ST-403', alternativeNo: '604.03.00.001' },
      ], relatedTypes: [] },
    // 手册 P44-45：活塞组件类型，其 RUN-HRS 计数器默认 dependsOn 主机 C-10001
    { id: uid('ct'), typeNumber: 'CT-1003', name: 'Main Engine Piston & Rod', maker: 'WART', model: 'S26MC', type: 'Piston', classCode: 'PIS', compTypeModel: 'S26MC-Piston', status: 'Active', preferredVendor: 'Wärtsilä Marine', parentTypeNumber: 'CT-1001', description: 'Piston and connecting rod assembly for S26MC main engine, parent type: Cylinder Liner', dateCreated: '2022-02-28', dateModified: '2024-07-01', jobs: 2, counters: [
        { code: 'RUN-HRS', description: 'Running Hours', unit: 'hrs', dependsOn: 'C-10001' },
      ], measurePointDefs: [], parts: [
        { stockTypeNo: 'ST-102', alternativeNo: '601.02.00.001' },
        { stockTypeNo: 'ST-101', alternativeNo: '' },
      ], relatedTypes: [] },
    // ===== 扩充：船舶各系统真实设备类型 =====
    { id: uid('ct'), typeNumber: 'CT-2002', name: 'Auxiliary Engine (Generator Set)', maker: 'MANE', model: '6L23/30', type: 'Generator', classCode: 'ENG', compTypeModel: '6L23/30H', status: 'Active', preferredVendor: 'MAN Energy Solutions', parentTypeNumber: '', description: 'Auxiliary 4-stroke generator engine for ship service power supply', dateCreated: '2022-05-12', dateModified: '2024-04-15', jobs: 4, counters: [
        { code: 'RUN-HRS', description: 'Running Hours', unit: 'hrs', dependsOn: '' },
        { code: 'FUEL-CONS', description: 'Fuel Consumption', unit: 't', dependsOn: '' },
      ], measurePointDefs: [
        { code: 'TC-TEMP', description: 'Turbocharger Temp', trend: 'Up', unit: '°C' },
        { code: 'LO-PRESS', description: 'Lub Oil Pressure', trend: 'Stable', unit: 'bar' },
      ], parts: [
        { stockTypeNo: 'ST-801', alternativeNo: '' },
        { stockTypeNo: 'ST-802', alternativeNo: '' },
      ], relatedTypes: [] },
    { id: uid('ct'), typeNumber: 'CT-2003', name: 'Fresh Water Generator', maker: 'ALFA', model: 'JWP-26', type: 'Evaporator', classCode: 'AUX', compTypeModel: 'JWP-26-C50', status: 'Active', preferredVendor: 'Alfa Laval', parentTypeNumber: '', description: 'Low-pressure evaporator for fresh water production from seawater', dateCreated: '2022-06-01', dateModified: '2024-02-28', jobs: 2, counters: [
        { code: 'PROD-CAP', description: 'Produced Capacity', unit: 'm³/day', dependsOn: '' },
      ], measurePointDefs: [
        { code: 'SALINITY', description: 'Salinity', trend: 'Up', unit: 'ppm' },
        { code: 'TEMP-OUT', description: 'Distillate Temp', trend: 'Stable', unit: '°C' },
        ], parts: [], relatedTypes: [] },
    { id: uid('ct'), typeNumber: 'CT-2004', name: 'Fuel Oil Purifier', maker: 'ALFA', model: 'MAPX-205', type: 'Purifier', classCode: 'ENG', compTypeModel: 'MAPX-205-T', status: 'Active', preferredVendor: 'Alfa Laval', parentTypeNumber: '', description: 'Centrifugal purifier for HFO and MDO treatment', dateCreated: '2022-06-15', dateModified: '2024-03-10', jobs: 3, counters: [
        { code: 'RUN-HRS', description: 'Running Hours', unit: 'hrs', dependsOn: '' },
      ], measurePointDefs: [
        { code: 'TEMP-OUT', description: 'Outlet Temp', trend: 'Stable', unit: '°C' },
      ], parts: [
        { stockTypeNo: 'ST-401', alternativeNo: '' },
      ], relatedTypes: [] },
    { id: uid('ct'), typeNumber: 'CT-2005', name: 'Steering Gear', maker: 'RRM', model: 'TF-80', type: 'Steering', classCode: 'DECK', compTypeModel: 'TF-80H', status: 'Active', preferredVendor: 'Rolls-Royce Marine', parentTypeNumber: '', description: 'Electro-hydraulic steering gear system for rudder control', dateCreated: '2022-07-20', dateModified: '2024-05-05', jobs: 2, counters: [
        { code: 'RAM-STROKE', description: 'Ram Stroke', unit: 'mm', dependsOn: '' },
      ], measurePointDefs: [
        { code: 'PRESSURE', description: 'Hydraulic Pressure', trend: 'Stable', unit: 'bar' },
      ], parts: [
        { stockTypeNo: 'ST-501', alternativeNo: '' },
        { stockTypeNo: 'ST-502', alternativeNo: '' },
      ], relatedTypes: [] },
    { id: uid('ct'), typeNumber: 'CT-2006', name: 'Plate Heat Exchanger', maker: 'SWEP', model: 'B200', type: 'Cooler', classCode: 'ENG', compTypeModel: 'B200TH', status: 'Active', preferredVendor: 'SWEP International', parentTypeNumber: '', description: 'Brazed plate heat exchanger for central cooling water system', dateCreated: '2022-08-03', dateModified: '2024-04-20', jobs: 2, counters: [], measurePointDefs: [
        { code: 'TEMP-OUT', description: 'Outlet Temp', trend: 'Up', unit: '°C' },
        { code: 'TEMP-IN', description: 'Inlet Temp', trend: 'Stable', unit: '°C' },
      ], parts: [
        { stockTypeNo: 'ST-601', alternativeNo: '' },
      ], relatedTypes: [] },
    { id: uid('ct'), typeNumber: 'CT-2007', name: 'Main Switchboard', maker: 'ABBM', model: 'UNIGEAR', type: 'Switchboard', classCode: 'ELE', compTypeModel: 'UNIGEAR 5500', status: 'Active', preferredVendor: 'ABB Marine', parentTypeNumber: '', description: 'Low-voltage main switchboard for power distribution and monitoring', dateCreated: '2022-08-18', dateModified: '2024-06-01', jobs: 3, counters: [], measurePointDefs: [
        { code: 'LOAD-CURR', description: 'Load Current', trend: 'Up', unit: 'A' },
        { code: 'FREQ', description: 'Frequency', trend: 'Stable', unit: 'Hz' },
      ], parts: [
        { stockTypeNo: 'ST-701', alternativeNo: '' },
        { stockTypeNo: 'ST-702', alternativeNo: '' },
      ], relatedTypes: [] },
    { id: uid('ct'), typeNumber: 'CT-2008', name: 'Emergency Generator', maker: 'CUMM', model: 'KTA19', type: 'Generator', classCode: 'ELE', compTypeModel: 'KTA19-G4', status: 'Active', preferredVendor: 'Cummins Inc.', parentTypeNumber: '', description: 'Diesel-driven emergency generator set for SOLAS compliance', dateCreated: '2022-09-01', dateModified: '2024-03-15', jobs: 2, counters: [
        { code: 'RUN-HRS', description: 'Running Hours', unit: 'hrs', dependsOn: '' },
      ], measurePointDefs: [], parts: [
        { stockTypeNo: 'ST-801', alternativeNo: '' },
        { stockTypeNo: 'ST-802', alternativeNo: '' },
      ], relatedTypes: [] },
    { id: uid('ct'), typeNumber: 'CT-2009', name: 'Mooring Winch', maker: 'MACG', model: 'MW-40', type: 'Winch', classCode: 'DECK', compTypeModel: 'MW-40T', status: 'Active', preferredVendor: 'MacGregor / Cargotec', parentTypeNumber: '', description: 'Hydraulic mooring winch for berthing and unberthing operations', dateCreated: '2022-09-15', dateModified: '2024-04-25', jobs: 2, counters: [
        { code: 'RUN-HRS', description: 'Running Hours', unit: 'hrs', dependsOn: '' },
      ], measurePointDefs: [
        { code: 'PRESSURE', description: 'Hydraulic Pressure', trend: 'Stable', unit: 'bar' },
      ], parts: [
        { stockTypeNo: 'ST-901', alternativeNo: '' },
        { stockTypeNo: 'ST-902', alternativeNo: '' },
      ], relatedTypes: [] },
    { id: uid('ct'), typeNumber: 'CT-2010', name: 'Cargo Hold / Hatch Cover', maker: 'TTS', model: 'CH-30', type: 'Hatch', classCode: 'CARGO', compTypeModel: 'CH-30P', status: 'Active', preferredVendor: 'TTS (MacGregor Group)', parentTypeNumber: '', description: 'Pont-type hatch cover for multi-purpose cargo hold', dateCreated: '2022-10-01', dateModified: '2024-02-10', jobs: 2, counters: [], measurePointDefs: [
        { code: 'TEMP', description: 'Hold Temp', trend: 'Stable', unit: '°C' },
        ], parts: [], relatedTypes: [] },
    { id: uid('ct'), typeNumber: 'CT-2011', name: 'HVAC Chiller', maker: 'CARR', model: '30HXC', type: 'Chiller', classCode: 'ACC', compTypeModel: '30HXC200', status: 'Active', preferredVendor: 'Carrier Corporation', parentTypeNumber: '', description: 'Water-cooled centrifugal chiller for air conditioning system', dateCreated: '2022-10-15', dateModified: '2024-05-12', jobs: 2, counters: [
        { code: 'RUN-HRS', description: 'Running Hours', unit: 'hrs', dependsOn: '' },
      ], measurePointDefs: [
        { code: 'TEMP-OUT', description: 'Supply Temp', trend: 'Stable', unit: '°C' },
        ], parts: [], relatedTypes: [] },
    { id: uid('ct'), typeNumber: 'CT-2012', name: 'Radar / Navigation Console', maker: 'FURU', model: 'FAR-2827', type: 'Radar', classCode: 'NAV', compTypeModel: 'FAR-2827S', status: 'Active', preferredVendor: 'Furuno Electric', parentTypeNumber: '', description: 'X-band navigation radar with ARPA and target tracking', dateCreated: '2022-11-01', dateModified: '2024-01-20', jobs: 1, counters: [], measurePointDefs: [], parts: [], relatedTypes: [] },
    { id: uid('ct'), typeNumber: 'CT-2013', name: 'Fire Detection Panel', maker: 'KIDDE', model: 'MX-400', type: 'Panel', classCode: 'SAF', compTypeModel: 'MX-400A', status: 'Active', preferredVendor: 'Kidde (Carrier Fire Products)', parentTypeNumber: '', description: 'Addressable fire detection panel with loop monitoring', dateCreated: '2022-11-15', dateModified: '2024-02-28', jobs: 1, counters: [], measurePointDefs: [
        { code: 'ZONE-STATUS', description: 'Zone Status', trend: 'Stable', unit: '' },
        ], parts: [], relatedTypes: [] },
    { id: uid('ct'), typeNumber: 'CT-2014', name: 'Lifeboat', maker: 'SCHAT', model: 'FFD-42', type: 'Lifeboat', classCode: 'LS', compTypeModel: 'FFD-42S', status: 'Active', preferredVendor: 'Schat-Harding (Viking Life-Saving)', parentTypeNumber: '', description: 'Totally enclosed free-fall lifeboat for 42 persons, SOLAS compliant', dateCreated: '2022-12-01', dateModified: '2024-03-30', jobs: 1, counters: [], measurePointDefs: [], parts: [], relatedTypes: [] },
  ],

  // 指南（手册 2.2）：组件状态为 In Use（已安装）/ Available（未安装）/ Transferred / Scrapped
  // department：手册 P20 范围标签，组件归属于当前 Department
  components: [
    // ===== MV Traveller 设备实例 =====
    CO({ installation: 'Traveller', number: 'C-10001', typeNumber: 'CT-1001', name: 'ME Cylinder #1', status: 'In Use', maker: 'WART', type: 'Liner', serialNo: 'WS-77412', location: 'Engine Room', department: 'Engine Room', vendor: 'Wärtsilä Marine', functionNo: 'FN-ENG-01', installDate: '2023-04-12',
      // 手册 P44-45：主机预置 RUN-HRS 读数，作为活塞计数器的依赖源
      componentCounters: [
        { code: 'RUN-HRS', description: 'Running Hours', unit: 'hrs', startValue: 0, currentValue: 78200, latestZeroedDate: '2023-04-12', average: 0, calculate: 'No', dependsOn: '' },
        { code: 'CYCLES', description: 'Start Cycles', unit: 'cycles', startValue: 0, currentValue: 0, latestZeroedDate: '', average: 0, calculate: 'No', dependsOn: '' },
      ] }),
    CO({ installation: 'Traveller', number: 'C-10002', typeNumber: 'CT-1002', name: 'Aux Boiler A', status: 'In Use', maker: 'AALB', type: 'Boiler', serialNo: 'AB-33901', location: 'Engine Room', department: 'Engine Room', vendor: 'Alfa Laval', functionNo: 'FN-ENG-02', installDate: '2022-11-03' }),
    CO({ installation: 'Traveller', number: 'C-20001', typeNumber: 'CT-2001', name: 'FW Pump P-21', status: 'Available', maker: 'GRUN', type: 'Pump', serialNo: 'GR-55120', location: 'Store', department: 'Engine Room', vendor: 'Grundfos', functionNo: '', installDate: '' }),
    CO({ installation: 'Traveller', number: 'C-30001', typeNumber: 'CT-3001', name: 'SW Valve V-7', status: 'Scrapped', maker: 'TYCO', type: 'Valve', serialNo: 'TY-11890', location: 'Deck', department: 'Deck', vendor: 'Tyco', functionNo: '', installDate: '2021-06-21' }),
    CO({ installation: 'Traveller', number: 'C-10003', typeNumber: 'CT-1002', name: 'Aux Boiler B', status: 'In Use', maker: 'AALB', type: 'Boiler', serialNo: 'AB-33902', location: 'Engine Room', department: 'Engine Room', vendor: 'Alfa Laval', functionNo: 'FN-ENG-03', installDate: '2022-11-03' }),
    // 手册 P44-45：10 个主发动机活塞（依赖主机 C-10001 的 RUN-HRS 计数器）
    ...pistonComponents.map((p) => ({ ...p, installation: 'Traveller' })),
    // Traveller 扩充设备实例
    CO({ installation: 'Traveller', number: 'C-10010', typeNumber: 'CT-2002', name: 'Aux Engine DG-1', status: 'In Use', maker: 'MANE', type: 'Generator', serialNo: 'MAN-DG1-001', location: 'Engine Room', department: 'Engine Room', vendor: 'MAN', functionNo: 'FN-ENG-10', installDate: '2022-01-15' }),
    CO({ installation: 'Traveller', number: 'C-10011', typeNumber: 'CT-2002', name: 'Aux Engine DG-2', status: 'In Use', maker: 'MANE', type: 'Generator', serialNo: 'MAN-DG2-002', location: 'Engine Room', department: 'Engine Room', vendor: 'MAN', functionNo: 'FN-ENG-11', installDate: '2022-01-15' }),
    CO({ installation: 'Traveller', number: 'C-10020', typeNumber: 'CT-2003', name: 'Fresh Water Generator', status: 'In Use', maker: 'ALFA', type: 'Evaporator', serialNo: 'AL-FWG-020', location: 'Engine Room', department: 'Engine Room', vendor: 'Alfa Laval', functionNo: 'FN-ENG-20', installDate: '2021-09-10' }),
    CO({ installation: 'Traveller', number: 'C-10030', typeNumber: 'CT-2004', name: 'Fuel Oil Purifier', status: 'In Use', maker: 'ALFA', type: 'Purifier', serialNo: 'AL-FOP-030', location: 'Engine Room', department: 'Engine Room', vendor: 'Alfa Laval', functionNo: 'FN-ENG-30', installDate: '2021-09-10' }),
    CO({ installation: 'Traveller', number: 'C-10040', typeNumber: 'CT-2005', name: 'Steering Gear', status: 'In Use', maker: 'RRM', type: 'Steering', serialNo: 'RR-SG-040', location: 'Steering Flat', department: 'Deck', vendor: 'Rolls-Royce', functionNo: 'FN-ENG-40', installDate: '2020-03-22' }),
    CO({ installation: 'Traveller', number: 'C-10050', typeNumber: 'CT-2006', name: 'Central Cooling Heat Exchanger', status: 'In Use', maker: 'SWEP', type: 'Cooler', serialNo: 'SW-CC-050', location: 'Engine Room', department: 'Engine Room', vendor: 'SWEP', functionNo: 'FN-ENG-50', installDate: '2020-03-22' }),
    CO({ installation: 'Traveller', number: 'C-10060', typeNumber: 'CT-2007', name: 'Main Switchboard', status: 'In Use', maker: 'ABBM', type: 'Switchboard', serialNo: 'ABB-MSB-060', location: 'Engine Room', department: 'Electrical', vendor: 'ABB', functionNo: 'FN-ELE-01', installDate: '2020-03-22' }),
    CO({ installation: 'Traveller', number: 'C-10070', typeNumber: 'CT-2008', name: 'Emergency Generator', status: 'In Use', maker: 'CUMM', type: 'Generator', serialNo: 'CM-EG-070', location: 'Emergency Gen Room', department: 'Electrical', vendor: 'Cummins', functionNo: 'FN-ELE-02', installDate: '2020-03-22' }),
    CO({ installation: 'Traveller', number: 'C-10080', typeNumber: 'CT-2009', name: 'Mooring Winch', status: 'In Use', maker: 'MACG', type: 'Winch', serialNo: 'MG-MW-080', location: 'Fore Deck', department: 'Deck', vendor: 'MacGregor', functionNo: 'FN-DECK-10', installDate: '2020-03-22' }),
    CO({ installation: 'Traveller', number: 'C-10090', typeNumber: 'CT-2010', name: 'Cargo Hold No.1', status: 'In Use', maker: 'TTS', type: 'Hatch', serialNo: 'TTS-CH-090', location: 'Cargo Hold', department: 'Cargo', vendor: 'TTS', functionNo: 'FN-CARGO-01', installDate: '2020-03-22' }),
    CO({ installation: 'Traveller', number: 'C-10100', typeNumber: 'CT-2011', name: 'HVAC Plant', status: 'In Use', maker: 'CARR', type: 'Chiller', serialNo: 'CA-HV-100', location: 'Accommodation', department: 'Accommodation', vendor: 'Carrier', functionNo: 'FN-ACC-01', installDate: '2020-03-22' }),
    CO({ installation: 'Traveller', number: 'C-10110', typeNumber: 'CT-2012', name: 'Radar / Navigation', status: 'In Use', maker: 'FURU', type: 'Radar', serialNo: 'FU-NAV-110', location: 'Bridge', department: 'Bridge', vendor: 'Furuno', functionNo: 'FN-NAV-01', installDate: '2020-03-22' }),
    CO({ installation: 'Traveller', number: 'C-10120', typeNumber: 'CT-2013', name: 'Fire Detection System', status: 'In Use', maker: 'KIDDE', type: 'Panel', serialNo: 'KI-FD-120', location: 'Engine Room', department: 'Electrical', vendor: 'Kidde', functionNo: 'FN-SAF-01', installDate: '2020-03-22' }),
    CO({ installation: 'Traveller', number: 'C-10130', typeNumber: 'CT-2014', name: 'Lifeboat', status: 'In Use', maker: 'SCHAT', type: 'Lifeboat', serialNo: 'SH-LB-130', location: 'Boat Deck', department: 'Deck', vendor: 'Schat-Harding', functionNo: 'FN-LS-01', installDate: '2020-03-22' }),

    // ===== MV Voyager 设备实例 =====
    CO({ installation: 'Voyager', number: 'C-VOY-1001', typeNumber: 'CT-1001', name: 'ME Cylinder #1', status: 'In Use', maker: 'WART', type: 'Liner', serialNo: 'WS-77412V', location: 'Engine Room', department: 'Engine Room', vendor: 'Wärtsilä Marine', functionNo: 'FN-VOY-ENG-01', installDate: '2021-06-01' }),
    CO({ installation: 'Voyager', number: 'C-VOY-1002', typeNumber: 'CT-1002', name: 'Aux Boiler A', status: 'In Use', maker: 'AALB', type: 'Boiler', serialNo: 'AB-33901V', location: 'Engine Room', department: 'Engine Room', vendor: 'Alfa Laval', functionNo: 'FN-VOY-ENG-02', installDate: '2021-06-01' }),
    CO({ installation: 'Voyager', number: 'C-VOY-1003', typeNumber: 'CT-2002', name: 'Aux Engine DG-1', status: 'In Use', maker: 'MANE', type: 'Generator', serialNo: 'MAN-DG1-V', location: 'Engine Room', department: 'Engine Room', vendor: 'MAN', functionNo: 'FN-VOY-ENG-10', installDate: '2021-06-01' }),
    CO({ installation: 'Voyager', number: 'C-VOY-1004', typeNumber: 'CT-2002', name: 'Aux Engine DG-2', status: 'In Use', maker: 'MANE', type: 'Generator', serialNo: 'MAN-DG2-V', location: 'Engine Room', department: 'Engine Room', vendor: 'MAN', functionNo: 'FN-VOY-ENG-11', installDate: '2021-06-01' }),
    CO({ installation: 'Voyager', number: 'C-VOY-1005', typeNumber: 'CT-2003', name: 'Fresh Water Generator', status: 'In Use', maker: 'ALFA', type: 'Evaporator', serialNo: 'AL-FWG-V', location: 'Engine Room', department: 'Engine Room', vendor: 'Alfa Laval', functionNo: 'FN-VOY-ENG-20', installDate: '2021-06-01' }),
    CO({ installation: 'Voyager', number: 'C-VOY-1006', typeNumber: 'CT-2004', name: 'Fuel Oil Purifier', status: 'In Use', maker: 'ALFA', type: 'Purifier', serialNo: 'AL-FOP-V', location: 'Engine Room', department: 'Engine Room', vendor: 'Alfa Laval', functionNo: 'FN-VOY-ENG-30', installDate: '2021-06-01' }),
    CO({ installation: 'Voyager', number: 'C-VOY-1007', typeNumber: 'CT-2007', name: 'Main Switchboard', status: 'In Use', maker: 'ABBM', type: 'Switchboard', serialNo: 'ABB-MSB-V', location: 'Engine Room', department: 'Electrical', vendor: 'ABB', functionNo: 'FN-VOY-ELE-01', installDate: '2021-06-01' }),
    CO({ installation: 'Voyager', number: 'C-VOY-1008', typeNumber: 'CT-2008', name: 'Emergency Generator', status: 'In Use', maker: 'CUMM', type: 'Generator', serialNo: 'CM-EG-V', location: 'Emergency Gen Room', department: 'Electrical', vendor: 'Cummins', functionNo: 'FN-VOY-ELE-02', installDate: '2021-06-01' }),
    CO({ installation: 'Voyager', number: 'C-VOY-1009', typeNumber: 'CT-2009', name: 'Deck Crane', status: 'In Use', maker: 'MACG', type: 'Winch', serialNo: 'MG-DC-V', location: 'Deck', department: 'Deck', vendor: 'MacGregor', functionNo: 'FN-VOY-DECK-01', installDate: '2021-06-01' }),
    CO({ installation: 'Voyager', number: 'C-VOY-1010', typeNumber: 'CT-2009', name: 'Mooring Winch', status: 'In Use', maker: 'MACG', type: 'Winch', serialNo: 'MG-MW-V', location: 'Fore Deck', department: 'Deck', vendor: 'MacGregor', functionNo: 'FN-VOY-DECK-10', installDate: '2021-06-01' }),
    CO({ installation: 'Voyager', number: 'C-VOY-1011', typeNumber: 'CT-2010', name: 'Cargo Hold No.1', status: 'In Use', maker: 'TTS', type: 'Hatch', serialNo: 'TTS-CH-V', location: 'Cargo Hold', department: 'Cargo', vendor: 'TTS', functionNo: 'FN-VOY-CARGO-01', installDate: '2021-06-01' }),
    CO({ installation: 'Voyager', number: 'C-VOY-1012', typeNumber: 'CT-2012', name: 'Radar / Navigation', status: 'In Use', maker: 'FURU', type: 'Radar', serialNo: 'FU-NAV-V', location: 'Bridge', department: 'Bridge', vendor: 'Furuno', functionNo: 'FN-VOY-NAV-01', installDate: '2021-06-01' }),
    CO({ installation: 'Voyager', number: 'C-VOY-1013', typeNumber: 'CT-2013', name: 'Fire Detection System', status: 'In Use', maker: 'KIDDE', type: 'Panel', serialNo: 'KI-FD-V', location: 'Engine Room', department: 'Electrical', vendor: 'Kidde', functionNo: 'FN-VOY-SAF-01', installDate: '2021-06-01' }),
    CO({ installation: 'Voyager', number: 'C-VOY-1014', typeNumber: 'CT-2014', name: 'Lifeboat', status: 'In Use', maker: 'SCHAT', type: 'Lifeboat', serialNo: 'SH-LB-V', location: 'Boat Deck', department: 'Deck', vendor: 'Schat-Harding', functionNo: 'FN-VOY-LS-01', installDate: '2021-06-01' }),
    CO({ installation: 'Voyager', number: 'C-VOY-2001', typeNumber: 'CT-2001', name: 'Spare FW Pump P-31', status: 'Available', maker: 'GRUN', type: 'Pump', serialNo: 'GR-55200', location: 'Store', department: 'Engineering', vendor: 'Grundfos', functionNo: '', installDate: '' }),
    CO({ installation: 'Voyager', number: 'C-VOY-3001', typeNumber: 'CT-3001', name: 'SW Valve V-3', status: 'Scrapped', maker: 'TYCO', type: 'Valve', serialNo: 'TY-30001', location: 'Deck', department: 'Deck', vendor: 'Tyco', functionNo: '', installDate: '2021-06-21' }),

    // ===== MV Endeavour 设备实例 =====
    CO({ installation: 'Endeavour', number: 'C-END-1001', typeNumber: 'CT-1001', name: 'ME Cylinder #1', status: 'In Use', maker: 'WART', type: 'Liner', serialNo: 'WS-77412E', location: 'Engine Room', department: 'Engine Room', vendor: 'Wärtsilä Marine', functionNo: 'FN-END-ENG-01', installDate: '2019-11-20' }),
    CO({ installation: 'Endeavour', number: 'C-END-1002', typeNumber: 'CT-1002', name: 'Aux Boiler A', status: 'In Use', maker: 'AALB', type: 'Boiler', serialNo: 'AB-33901E', location: 'Engine Room', department: 'Engine Room', vendor: 'Alfa Laval', functionNo: 'FN-END-ENG-02', installDate: '2019-11-20' }),
    CO({ installation: 'Endeavour', number: 'C-END-1003', typeNumber: 'CT-2002', name: 'Aux Engine DG-1', status: 'In Use', maker: 'MANE', type: 'Generator', serialNo: 'MAN-DG1-E', location: 'Engine Room', department: 'Engine Room', vendor: 'MAN', functionNo: 'FN-END-ENG-10', installDate: '2019-11-20' }),
    CO({ installation: 'Endeavour', number: 'C-END-1004', typeNumber: 'CT-2002', name: 'Aux Engine DG-2', status: 'In Use', maker: 'MANE', type: 'Generator', serialNo: 'MAN-DG2-E', location: 'Engine Room', department: 'Engine Room', vendor: 'MAN', functionNo: 'FN-END-ENG-11', installDate: '2019-11-20' }),
    CO({ installation: 'Endeavour', number: 'C-END-1005', typeNumber: 'CT-2003', name: 'Fresh Water Generator', status: 'In Use', maker: 'ALFA', type: 'Evaporator', serialNo: 'AL-FWG-E', location: 'Engine Room', department: 'Engine Room', vendor: 'Alfa Laval', functionNo: 'FN-END-ENG-20', installDate: '2019-11-20' }),
    CO({ installation: 'Endeavour', number: 'C-END-1006', typeNumber: 'CT-2004', name: 'Fuel Oil Purifier', status: 'In Use', maker: 'ALFA', type: 'Purifier', serialNo: 'AL-FOP-E', location: 'Engine Room', department: 'Engine Room', vendor: 'Alfa Laval', functionNo: 'FN-END-ENG-30', installDate: '2019-11-20' }),
    CO({ installation: 'Endeavour', number: 'C-END-1007', typeNumber: 'CT-2001', name: 'Cargo Oil Pump', status: 'In Use', maker: 'GRUN', type: 'Pump', serialNo: 'GR-COP-E', location: 'Pump Room', department: 'Cargo', vendor: 'Grundfos', functionNo: 'FN-END-ENG-40', installDate: '2019-11-20' }),
    CO({ installation: 'Endeavour', number: 'C-END-1008', typeNumber: 'CT-2007', name: 'Main Switchboard', status: 'In Use', maker: 'ABBM', type: 'Switchboard', serialNo: 'ABB-MSB-E', location: 'Engine Room', department: 'Electrical', vendor: 'ABB', functionNo: 'FN-END-ELE-01', installDate: '2019-11-20' }),
    CO({ installation: 'Endeavour', number: 'C-END-1009', typeNumber: 'CT-2008', name: 'Emergency Generator', status: 'In Use', maker: 'CUMM', type: 'Generator', serialNo: 'CM-EG-E', location: 'Emergency Gen Room', department: 'Electrical', vendor: 'Cummins', functionNo: 'FN-END-ELE-02', installDate: '2019-11-20' }),
    CO({ installation: 'Endeavour', number: 'C-END-1010', typeNumber: 'CT-2009', name: 'Mooring Winch', status: 'In Use', maker: 'MACG', type: 'Winch', serialNo: 'MG-MW-E', location: 'Fore Deck', department: 'Deck', vendor: 'MacGregor', functionNo: 'FN-END-DECK-10', installDate: '2019-11-20' }),
    CO({ installation: 'Endeavour', number: 'C-END-1011', typeNumber: 'CT-2010', name: 'Cargo Tank No.1', status: 'In Use', maker: 'TTS', type: 'Hatch', serialNo: 'TTS-CT-E', location: 'Cargo Tank', department: 'Cargo', vendor: 'TTS', functionNo: 'FN-END-CARGO-01', installDate: '2019-11-20' }),
    CO({ installation: 'Endeavour', number: 'C-END-1012', typeNumber: 'CT-2012', name: 'Radar / Navigation', status: 'In Use', maker: 'FURU', type: 'Radar', serialNo: 'FU-NAV-E', location: 'Bridge', department: 'Bridge', vendor: 'Furuno', functionNo: 'FN-END-NAV-01', installDate: '2019-11-20' }),
    CO({ installation: 'Endeavour', number: 'C-END-1013', typeNumber: 'CT-2013', name: 'Fire Detection System', status: 'In Use', maker: 'KIDDE', type: 'Panel', serialNo: 'KI-FD-E', location: 'Engine Room', department: 'Electrical', vendor: 'Kidde', functionNo: 'FN-END-SAF-01', installDate: '2019-11-20' }),
    CO({ installation: 'Endeavour', number: 'C-END-1014', typeNumber: 'CT-2014', name: 'Lifeboat', status: 'In Use', maker: 'SCHAT', type: 'Lifeboat', serialNo: 'SH-LB-E', location: 'Boat Deck', department: 'Deck', vendor: 'Schat-Harding', functionNo: 'FN-END-LS-01', installDate: '2019-11-20' }),
    CO({ installation: 'Endeavour', number: 'C-END-2001', typeNumber: 'CT-2001', name: 'Spare Cargo Pump P-41', status: 'Available', maker: 'GRUN', type: 'Pump', serialNo: 'GR-56400', location: 'Store', department: 'Engineering', vendor: 'Grundfos', functionNo: '', installDate: '' }),
    CO({ installation: 'Endeavour', number: 'C-END-3001', typeNumber: 'CT-3001', name: 'SW Valve V-5', status: 'Scrapped', maker: 'TYCO', type: 'Valve', serialNo: 'TY-30005', location: 'Deck', department: 'Deck', vendor: 'Tyco', functionNo: '', installDate: '2019-11-21' }),
  ],

  // 指南（手册 2.2 / Component Status）：组件状态变更日志。
  // 所有状态变更（安装/拆卸自动推导、Options > Change Status、Transferred 与 Stock Wanted 交互）
  // 都会在此留痕，供 Options > Component Status Log（单组件）与 Maintenance > Component Status Log（全部）查询。
  componentStatusLog: [
    { id: uid('csl'), componentId: 'co_1001', componentNo: 'C-10001', componentName: 'ME Cylinder #1', oldStatus: 'Available', newStatus: 'In Use', changedBy: 'A. Admin', changedAt: '2023-04-12', reason: 'Registered & installed on function' },
    { id: uid('csl'), componentId: 'co_1002', componentNo: 'C-10002', componentName: 'Aux Boiler A', oldStatus: 'Available', newStatus: 'In Use', changedBy: 'A. Admin', changedAt: '2022-11-03', reason: 'Registered & installed on function' },
    { id: uid('csl'), componentId: 'co_3001', componentNo: 'C-30001', componentName: 'SW Valve V-7', oldStatus: 'In Use', newStatus: 'Scrapped', changedBy: 'A. Admin', changedAt: '2025-09-30', reason: 'Manual change (Options > Change Status)' },
  ],

  // 手册 P44-46：Function Criticality 注册表（degree 列表 + 颜色编码指示器）。
  // 先在此定义可用的关键性程度（Description + colour-coded Indicator），再在 Functions / Functions Hierarchy 窗口应用到功能位置。
  // 手册 P44 截图示例值：High / Low / Medium / Not defined。
  functionCriticalities: [
    { id: uid('fc'), code: 'High', description: 'High', color: '#e74c3c' },
    { id: uid('fc'), code: 'Medium', description: 'Medium', color: '#f39c12' },
    { id: uid('fc'), code: 'Low', description: 'Low', color: '#27ae60' },
    { id: uid('fc'), code: 'Not defined', description: 'Not defined', color: '#bdc3c7' },
  ],

  // 指南（手册 2.3）：功能位置状态为 In Use / Scrapped
  // 字段对齐手册「Working with Functions」：General / Details / Additional Info / Financial Info / Counters / Rotation Log
  functions: [
    // ===== MV Traveller（散货船）功能位置树 =====
    FN({ installation: 'Traveller', functionNo: 'FN-ENG-01', description: 'Main Engine', reference: 'ME', parentFunctionNo: '', status: 'In Use', location: 'Engine Room', department: 'Engine Room', installedComponentId: 'C-10001', criticality: 'High', counter: 'Running Hours',
      sfiCode: '21000000', system: 'Machinery', subSystem: 'Propulsion', remarks: '主机系统功能位置', serialNo: 'WS-77412', maker: 'WART', model: 'RT-flex', tagNo: 'ME-01',
      assetValue: 2500000, acquisitionDate: '2018-05-01', currency: 'USD', depreciation: 0,
      functionCounters: [{ code: 'RH', description: 'Running Hours', unit: 'h', lastValue: 48230 }],
      rotationLog: [{ componentNo: 'C-10001', componentName: 'ME Cylinder #1', action: 'Installed', performedBy: 'A. Admin', performedAt: '2023-04-12' }] }),
    FN({ installation: 'Traveller', functionNo: 'FN-ENG-02', description: 'Auxiliary Boiler A', reference: 'AUX BOILER A', parentFunctionNo: 'FN-ENG-01', status: 'In Use', location: 'Engine Room', department: 'Engine Room', installedComponentId: 'C-10002', criticality: 'High', counter: 'Fired Hours',
      sfiCode: '23000000', system: 'Machinery', subSystem: 'Boiler', remarks: '', serialNo: 'AB-33901', maker: 'AALB', model: 'AV-6', tagNo: 'AB-A',
      assetValue: 480000, acquisitionDate: '2019-02-15', currency: 'USD', depreciation: 0,
      functionCounters: [{ code: 'FH', description: 'Fired Hours', unit: 'h', lastValue: 31200 }],
      rotationLog: [{ componentNo: 'C-10002', componentName: 'Aux Boiler A', action: 'Installed', performedBy: 'A. Admin', performedAt: '2022-11-03' }] }),
    FN({ installation: 'Traveller', functionNo: 'FN-ENG-03', description: 'Auxiliary Boiler B', reference: 'AUX BOILER B', parentFunctionNo: 'FN-ENG-01', status: 'In Use', location: 'Engine Room', department: 'Engine Room', installedComponentId: 'C-10003', criticality: 'High', counter: 'Fired Hours',
      sfiCode: '23000000', system: 'Machinery', subSystem: 'Boiler', remarks: '', serialNo: 'AB-33902', maker: 'AALB', model: 'AV-6', tagNo: 'AB-B',
      assetValue: 480000, acquisitionDate: '2019-02-15', currency: 'USD', depreciation: 0,
      functionCounters: [{ code: 'FH', description: 'Fired Hours', unit: 'h', lastValue: 29870 }],
      rotationLog: [{ componentNo: 'C-10003', componentName: 'Aux Boiler B', action: 'Installed', performedBy: 'A. Admin', performedAt: '2022-11-03' }] }),
    FN({ installation: 'Traveller', functionNo: 'FN-DECK-01', description: 'Deck Crane', reference: 'DCRANE', parentFunctionNo: '', status: 'In Use', location: 'Deck', department: 'Deck', installedComponentId: '', criticality: 'Medium', counter: 'Operation Hours',
      sfiCode: '12000000', system: 'Hull', subSystem: 'Deck Crane', remarks: '', serialNo: '', maker: '', model: '', tagNo: 'DC-01',
      assetValue: 0, acquisitionDate: '', currency: 'USD', depreciation: 0,
      functionCounters: [{ code: 'OH', description: 'Operation Hours', unit: 'h', lastValue: 12450 }], rotationLog: [] }),
    // Traveller 扩充：发电机 / 造水机 / 分油机 / 舵机 / 配电 / 甲板 / 货舱 / 居装 / 通导 / 安全 / 救生
    FN({ installation: 'Traveller', functionNo: 'FN-ENG-10', description: 'Auxiliary Engine DG-1', reference: 'DG-1', parentFunctionNo: '', status: 'In Use', location: 'Engine Room', department: 'Engine Room', installedComponentId: 'C-10010', criticality: 'High', counter: 'Running Hours',
      sfiCode: '22000000', system: 'Machinery', subSystem: 'Generator', tagNo: 'DG-1', functionCounters: [{ code: 'RH', description: 'Running Hours', unit: 'h', lastValue: 31540 }], rotationLog: [{ componentNo: 'C-10010', componentName: 'Aux Engine DG-1', action: 'Installed', performedBy: 'A. Admin', performedAt: '2022-01-15' }] }),
    FN({ installation: 'Traveller', functionNo: 'FN-ENG-11', description: 'Auxiliary Engine DG-2', reference: 'DG-2', parentFunctionNo: '', status: 'In Use', location: 'Engine Room', department: 'Engine Room', installedComponentId: 'C-10011', criticality: 'High', counter: 'Running Hours',
      sfiCode: '22000000', system: 'Machinery', subSystem: 'Generator', tagNo: 'DG-2', functionCounters: [{ code: 'RH', description: 'Running Hours', unit: 'h', lastValue: 30210 }], rotationLog: [{ componentNo: 'C-10011', componentName: 'Aux Engine DG-2', action: 'Installed', performedBy: 'A. Admin', performedAt: '2022-01-15' }] }),
    FN({ installation: 'Traveller', functionNo: 'FN-ENG-20', description: 'Fresh Water Generator', reference: 'FWG', parentFunctionNo: '', status: 'In Use', location: 'Engine Room', department: 'Engine Room', installedComponentId: 'C-10020', criticality: 'Medium', counter: 'Produced Capacity',
      sfiCode: '24000000', system: 'Machinery', subSystem: 'Fresh Water', tagNo: 'FWG-1', rotationLog: [{ componentNo: 'C-10020', componentName: 'Fresh Water Generator', action: 'Installed', performedBy: 'A. Admin', performedAt: '2021-09-10' }] }),
    FN({ installation: 'Traveller', functionNo: 'FN-ENG-30', description: 'Fuel Oil Purifier', reference: 'FOP', parentFunctionNo: '', status: 'In Use', location: 'Engine Room', department: 'Engine Room', installedComponentId: 'C-10030', criticality: 'Medium', counter: 'Running Hours',
      sfiCode: '25000000', system: 'Machinery', subSystem: 'Purifier', tagNo: 'FOP-1', rotationLog: [{ componentNo: 'C-10030', componentName: 'Fuel Oil Purifier', action: 'Installed', performedBy: 'A. Admin', performedAt: '2021-09-10' }] }),
    FN({ installation: 'Traveller', functionNo: 'FN-ENG-40', description: 'Steering Gear', reference: 'STR', parentFunctionNo: '', status: 'In Use', location: 'Steering Flat', department: 'Deck', installedComponentId: 'C-10040', criticality: 'High', counter: 'Ram Stroke',
      sfiCode: '27000000', system: 'Hull', subSystem: 'Steering', tagNo: 'STR-1', rotationLog: [{ componentNo: 'C-10040', componentName: 'Steering Gear', action: 'Installed', performedBy: 'A. Admin', performedAt: '2020-03-22' }] }),
    FN({ installation: 'Traveller', functionNo: 'FN-ENG-50', description: 'Central Cooling Heat Exchanger', reference: 'CC', parentFunctionNo: '', status: 'In Use', location: 'Engine Room', department: 'Engine Room', installedComponentId: 'C-10050', criticality: 'Medium', counter: 'Running Hours',
      sfiCode: '26000000', system: 'Machinery', subSystem: 'Cooling', tagNo: 'CC-1', rotationLog: [{ componentNo: 'C-10050', componentName: 'Central Cooling Heat Exchanger', action: 'Installed', performedBy: 'A. Admin', performedAt: '2020-03-22' }] }),
    FN({ installation: 'Traveller', functionNo: 'FN-ELE-01', description: 'Main Switchboard', reference: 'MSB', parentFunctionNo: '', status: 'In Use', location: 'Engine Room', department: 'Electrical', installedComponentId: 'C-10060', criticality: 'High', counter: 'Load Current',
      sfiCode: '31000000', system: 'Electrical', subSystem: 'Switchboard', tagNo: 'MSB-1', rotationLog: [{ componentNo: 'C-10060', componentName: 'Main Switchboard', action: 'Installed', performedBy: 'A. Admin', performedAt: '2020-03-22' }] }),
    FN({ installation: 'Traveller', functionNo: 'FN-ELE-02', description: 'Emergency Generator', reference: 'EG', parentFunctionNo: '', status: 'In Use', location: 'Emergency Gen Room', department: 'Electrical', installedComponentId: 'C-10070', criticality: 'High', counter: 'Running Hours',
      sfiCode: '32000000', system: 'Electrical', subSystem: 'Emergency Power', tagNo: 'EG-1', rotationLog: [{ componentNo: 'C-10070', componentName: 'Emergency Generator', action: 'Installed', performedBy: 'A. Admin', performedAt: '2020-03-22' }] }),
    FN({ installation: 'Traveller', functionNo: 'FN-DECK-10', description: 'Mooring Winch', reference: 'MWA', parentFunctionNo: '', status: 'In Use', location: 'Fore Deck', department: 'Deck', installedComponentId: 'C-10080', criticality: 'Medium', counter: 'Running Hours',
      sfiCode: '13000000', system: 'Hull', subSystem: 'Mooring', tagNo: 'MWA-1', rotationLog: [{ componentNo: 'C-10080', componentName: 'Mooring Winch', action: 'Installed', performedBy: 'A. Admin', performedAt: '2020-03-22' }] }),
    FN({ installation: 'Traveller', functionNo: 'FN-CARGO-01', description: 'Cargo Hold No.1', reference: 'CH1', parentFunctionNo: '', status: 'In Use', location: 'Cargo Hold', department: 'Cargo', installedComponentId: 'C-10090', criticality: 'Medium', counter: 'Operation Hours',
      sfiCode: '61000000', system: 'Cargo', subSystem: 'Hold', tagNo: 'CH1', rotationLog: [{ componentNo: 'C-10090', componentName: 'Cargo Hold No.1', action: 'Installed', performedBy: 'A. Admin', performedAt: '2020-03-22' }] }),
    FN({ installation: 'Traveller', functionNo: 'FN-ACC-01', description: 'HVAC Plant', reference: 'HVAC', parentFunctionNo: '', status: 'In Use', location: 'Accommodation', department: 'Accommodation', installedComponentId: 'C-10100', criticality: 'Low', counter: 'Running Hours',
      sfiCode: '71000000', system: 'Accommodation', subSystem: 'HVAC', tagNo: 'HVAC-1', rotationLog: [{ componentNo: 'C-10100', componentName: 'HVAC Plant', action: 'Installed', performedBy: 'A. Admin', performedAt: '2020-03-22' }] }),
    FN({ installation: 'Traveller', functionNo: 'FN-NAV-01', description: 'Radar / Navigation', reference: 'NAV', parentFunctionNo: '', status: 'In Use', location: 'Bridge', department: 'Bridge', installedComponentId: 'C-10110', criticality: 'High', counter: '',
      sfiCode: '81000000', system: 'Navigation', subSystem: 'Radar', tagNo: 'NAV-1', rotationLog: [{ componentNo: 'C-10110', componentName: 'Radar / Navigation', action: 'Installed', performedBy: 'A. Admin', performedAt: '2020-03-22' }] }),
    FN({ installation: 'Traveller', functionNo: 'FN-SAF-01', description: 'Fire Detection System', reference: 'FDS', parentFunctionNo: '', status: 'In Use', location: 'Engine Room', department: 'Electrical', installedComponentId: 'C-10120', criticality: 'High', counter: '',
      sfiCode: '51000000', system: 'Safety', subSystem: 'Fire', tagNo: 'FDS-1', rotationLog: [{ componentNo: 'C-10120', componentName: 'Fire Detection System', action: 'Installed', performedBy: 'A. Admin', performedAt: '2020-03-22' }] }),
    FN({ installation: 'Traveller', functionNo: 'FN-LS-01', description: 'Lifeboat', reference: 'LB', parentFunctionNo: '', status: 'In Use', location: 'Boat Deck', department: 'Deck', installedComponentId: 'C-10130', criticality: 'High', counter: '',
      sfiCode: '91000000', system: 'Lifesaving', subSystem: 'Lifeboat', tagNo: 'LB-1', rotationLog: [{ componentNo: 'C-10130', componentName: 'Lifeboat', action: 'Installed', performedBy: 'A. Admin', performedAt: '2020-03-22' }] }),

    // ===== MV Voyager（集装箱船）功能位置树 =====
    FN({ installation: 'Voyager', functionNo: 'FN-VOY-ENG-01', description: 'Main Engine', reference: 'ME', parentFunctionNo: '', status: 'In Use', location: 'Engine Room', department: 'Engine Room', installedComponentId: 'C-VOY-1001', criticality: 'High', counter: 'Running Hours',
      sfiCode: '21000000', system: 'Machinery', subSystem: 'Propulsion', tagNo: 'ME-01', functionCounters: [{ code: 'RH', description: 'Running Hours', unit: 'h', lastValue: 61020 }], rotationLog: [{ componentNo: 'C-VOY-1001', componentName: 'ME Cylinder #1', action: 'Installed', performedBy: 'A. Admin', performedAt: '2021-06-01' }] }),
    FN({ installation: 'Voyager', functionNo: 'FN-VOY-ENG-02', description: 'Auxiliary Boiler A', reference: 'AUX BOILER A', parentFunctionNo: 'FN-VOY-ENG-01', status: 'In Use', location: 'Engine Room', department: 'Engine Room', installedComponentId: 'C-VOY-1002', criticality: 'High', counter: 'Fired Hours',
      sfiCode: '23000000', system: 'Machinery', subSystem: 'Boiler', tagNo: 'AB-A', rotationLog: [{ componentNo: 'C-VOY-1002', componentName: 'Aux Boiler A', action: 'Installed', performedBy: 'A. Admin', performedAt: '2021-06-01' }] }),
    FN({ installation: 'Voyager', functionNo: 'FN-VOY-ENG-10', description: 'Auxiliary Engine DG-1', reference: 'DG-1', parentFunctionNo: '', status: 'In Use', location: 'Engine Room', department: 'Engine Room', installedComponentId: 'C-VOY-1003', criticality: 'High', counter: 'Running Hours',
      sfiCode: '22000000', system: 'Machinery', subSystem: 'Generator', tagNo: 'DG-1', rotationLog: [{ componentNo: 'C-VOY-1003', componentName: 'Aux Engine DG-1', action: 'Installed', performedBy: 'A. Admin', performedAt: '2021-06-01' }] }),
    FN({ installation: 'Voyager', functionNo: 'FN-VOY-ENG-11', description: 'Auxiliary Engine DG-2', reference: 'DG-2', parentFunctionNo: '', status: 'In Use', location: 'Engine Room', department: 'Engine Room', installedComponentId: 'C-VOY-1004', criticality: 'High', counter: 'Running Hours',
      sfiCode: '22000000', system: 'Machinery', subSystem: 'Generator', tagNo: 'DG-2', rotationLog: [{ componentNo: 'C-VOY-1004', componentName: 'Aux Engine DG-2', action: 'Installed', performedBy: 'A. Admin', performedAt: '2021-06-01' }] }),
    FN({ installation: 'Voyager', functionNo: 'FN-VOY-ENG-20', description: 'Fresh Water Generator', reference: 'FWG', parentFunctionNo: '', status: 'In Use', location: 'Engine Room', department: 'Engine Room', installedComponentId: 'C-VOY-1005', criticality: 'Medium', counter: 'Produced Capacity',
      sfiCode: '24000000', system: 'Machinery', subSystem: 'Fresh Water', tagNo: 'FWG-1', rotationLog: [{ componentNo: 'C-VOY-1005', componentName: 'Fresh Water Generator', action: 'Installed', performedBy: 'A. Admin', performedAt: '2021-06-01' }] }),
    FN({ installation: 'Voyager', functionNo: 'FN-VOY-ENG-30', description: 'Fuel Oil Purifier', reference: 'FOP', parentFunctionNo: '', status: 'In Use', location: 'Engine Room', department: 'Engine Room', installedComponentId: 'C-VOY-1006', criticality: 'Medium', counter: 'Running Hours',
      sfiCode: '25000000', system: 'Machinery', subSystem: 'Purifier', tagNo: 'FOP-1', rotationLog: [{ componentNo: 'C-VOY-1006', componentName: 'Fuel Oil Purifier', action: 'Installed', performedBy: 'A. Admin', performedAt: '2021-06-01' }] }),
    FN({ installation: 'Voyager', functionNo: 'FN-VOY-ELE-01', description: 'Main Switchboard', reference: 'MSB', parentFunctionNo: '', status: 'In Use', location: 'Engine Room', department: 'Electrical', installedComponentId: 'C-VOY-1007', criticality: 'High', counter: 'Load Current',
      sfiCode: '31000000', system: 'Electrical', subSystem: 'Switchboard', tagNo: 'MSB-1', rotationLog: [{ componentNo: 'C-VOY-1007', componentName: 'Main Switchboard', action: 'Installed', performedBy: 'A. Admin', performedAt: '2021-06-01' }] }),
    FN({ installation: 'Voyager', functionNo: 'FN-VOY-ELE-02', description: 'Emergency Generator', reference: 'EG', parentFunctionNo: '', status: 'In Use', location: 'Emergency Gen Room', department: 'Electrical', installedComponentId: 'C-VOY-1008', criticality: 'High', counter: 'Running Hours',
      sfiCode: '32000000', system: 'Electrical', subSystem: 'Emergency Power', tagNo: 'EG-1', rotationLog: [{ componentNo: 'C-VOY-1008', componentName: 'Emergency Generator', action: 'Installed', performedBy: 'A. Admin', performedAt: '2021-06-01' }] }),
    FN({ installation: 'Voyager', functionNo: 'FN-VOY-DECK-01', description: 'Deck Crane', reference: 'DCRANE', parentFunctionNo: '', status: 'In Use', location: 'Deck', department: 'Deck', installedComponentId: 'C-VOY-1009', criticality: 'Medium', counter: 'Operation Hours',
      sfiCode: '12000000', system: 'Hull', subSystem: 'Deck Crane', tagNo: 'DC-01', rotationLog: [{ componentNo: 'C-VOY-1009', componentName: 'Deck Crane', action: 'Installed', performedBy: 'A. Admin', performedAt: '2021-06-01' }] }),
    FN({ installation: 'Voyager', functionNo: 'FN-VOY-DECK-10', description: 'Mooring Winch', reference: 'MWA', parentFunctionNo: '', status: 'In Use', location: 'Fore Deck', department: 'Deck', installedComponentId: 'C-VOY-1010', criticality: 'Medium', counter: 'Running Hours',
      sfiCode: '13000000', system: 'Hull', subSystem: 'Mooring', tagNo: 'MWA-1', rotationLog: [{ componentNo: 'C-VOY-1010', componentName: 'Mooring Winch', action: 'Installed', performedBy: 'A. Admin', performedAt: '2021-06-01' }] }),
    FN({ installation: 'Voyager', functionNo: 'FN-VOY-CARGO-01', description: 'Cargo Hold No.1', reference: 'CH1', parentFunctionNo: '', status: 'In Use', location: 'Cargo Hold', department: 'Cargo', installedComponentId: 'C-VOY-1011', criticality: 'Medium', counter: 'Operation Hours',
      sfiCode: '61000000', system: 'Cargo', subSystem: 'Hold', tagNo: 'CH1', rotationLog: [{ componentNo: 'C-VOY-1011', componentName: 'Cargo Hold No.1', action: 'Installed', performedBy: 'A. Admin', performedAt: '2021-06-01' }] }),
    FN({ installation: 'Voyager', functionNo: 'FN-VOY-NAV-01', description: 'Radar / Navigation', reference: 'NAV', parentFunctionNo: '', status: 'In Use', location: 'Bridge', department: 'Bridge', installedComponentId: 'C-VOY-1012', criticality: 'High', counter: '',
      sfiCode: '81000000', system: 'Navigation', subSystem: 'Radar', tagNo: 'NAV-1', rotationLog: [{ componentNo: 'C-VOY-1012', componentName: 'Radar / Navigation', action: 'Installed', performedBy: 'A. Admin', performedAt: '2021-06-01' }] }),
    FN({ installation: 'Voyager', functionNo: 'FN-VOY-SAF-01', description: 'Fire Detection System', reference: 'FDS', parentFunctionNo: '', status: 'In Use', location: 'Engine Room', department: 'Electrical', installedComponentId: 'C-VOY-1013', criticality: 'High', counter: '',
      sfiCode: '51000000', system: 'Safety', subSystem: 'Fire', tagNo: 'FDS-1', rotationLog: [{ componentNo: 'C-VOY-1013', componentName: 'Fire Detection System', action: 'Installed', performedBy: 'A. Admin', performedAt: '2021-06-01' }] }),
    FN({ installation: 'Voyager', functionNo: 'FN-VOY-LS-01', description: 'Lifeboat', reference: 'LB', parentFunctionNo: '', status: 'In Use', location: 'Boat Deck', department: 'Deck', installedComponentId: 'C-VOY-1014', criticality: 'High', counter: '',
      sfiCode: '91000000', system: 'Lifesaving', subSystem: 'Lifeboat', tagNo: 'LB-1', rotationLog: [{ componentNo: 'C-VOY-1014', componentName: 'Lifeboat', action: 'Installed', performedBy: 'A. Admin', performedAt: '2021-06-01' }] }),

    // ===== MV Endeavour（油轮）功能位置树 =====
    FN({ installation: 'Endeavour', functionNo: 'FN-END-ENG-01', description: 'Main Engine', reference: 'ME', parentFunctionNo: '', status: 'In Use', location: 'Engine Room', department: 'Engine Room', installedComponentId: 'C-END-1001', criticality: 'High', counter: 'Running Hours',
      sfiCode: '21000000', system: 'Machinery', subSystem: 'Propulsion', tagNo: 'ME-01', functionCounters: [{ code: 'RH', description: 'Running Hours', unit: 'h', lastValue: 52410 }], rotationLog: [{ componentNo: 'C-END-1001', componentName: 'ME Cylinder #1', action: 'Installed', performedBy: 'A. Admin', performedAt: '2019-11-20' }] }),
    FN({ installation: 'Endeavour', functionNo: 'FN-END-ENG-02', description: 'Auxiliary Boiler A', reference: 'AUX BOILER A', parentFunctionNo: 'FN-END-ENG-01', status: 'In Use', location: 'Engine Room', department: 'Engine Room', installedComponentId: 'C-END-1002', criticality: 'High', counter: 'Fired Hours',
      sfiCode: '23000000', system: 'Machinery', subSystem: 'Boiler', tagNo: 'AB-A', rotationLog: [{ componentNo: 'C-END-1002', componentName: 'Aux Boiler A', action: 'Installed', performedBy: 'A. Admin', performedAt: '2019-11-20' }] }),
    FN({ installation: 'Endeavour', functionNo: 'FN-END-ENG-10', description: 'Auxiliary Engine DG-1', reference: 'DG-1', parentFunctionNo: '', status: 'In Use', location: 'Engine Room', department: 'Engine Room', installedComponentId: 'C-END-1003', criticality: 'High', counter: 'Running Hours',
      sfiCode: '22000000', system: 'Machinery', subSystem: 'Generator', tagNo: 'DG-1', rotationLog: [{ componentNo: 'C-END-1003', componentName: 'Aux Engine DG-1', action: 'Installed', performedBy: 'A. Admin', performedAt: '2019-11-20' }] }),
    FN({ installation: 'Endeavour', functionNo: 'FN-END-ENG-11', description: 'Auxiliary Engine DG-2', reference: 'DG-2', parentFunctionNo: '', status: 'In Use', location: 'Engine Room', department: 'Engine Room', installedComponentId: 'C-END-1004', criticality: 'High', counter: 'Running Hours',
      sfiCode: '22000000', system: 'Machinery', subSystem: 'Generator', tagNo: 'DG-2', rotationLog: [{ componentNo: 'C-END-1004', componentName: 'Aux Engine DG-2', action: 'Installed', performedBy: 'A. Admin', performedAt: '2019-11-20' }] }),
    FN({ installation: 'Endeavour', functionNo: 'FN-END-ENG-20', description: 'Fresh Water Generator', reference: 'FWG', parentFunctionNo: '', status: 'In Use', location: 'Engine Room', department: 'Engine Room', installedComponentId: 'C-END-1005', criticality: 'Medium', counter: 'Produced Capacity',
      sfiCode: '24000000', system: 'Machinery', subSystem: 'Fresh Water', tagNo: 'FWG-1', rotationLog: [{ componentNo: 'C-END-1005', componentName: 'Fresh Water Generator', action: 'Installed', performedBy: 'A. Admin', performedAt: '2019-11-20' }] }),
    FN({ installation: 'Endeavour', functionNo: 'FN-END-ENG-30', description: 'Fuel Oil Purifier', reference: 'FOP', parentFunctionNo: '', status: 'In Use', location: 'Engine Room', department: 'Engine Room', installedComponentId: 'C-END-1006', criticality: 'Medium', counter: 'Running Hours',
      sfiCode: '25000000', system: 'Machinery', subSystem: 'Purifier', tagNo: 'FOP-1', rotationLog: [{ componentNo: 'C-END-1006', componentName: 'Fuel Oil Purifier', action: 'Installed', performedBy: 'A. Admin', performedAt: '2019-11-20' }] }),
    FN({ installation: 'Endeavour', functionNo: 'FN-END-ENG-40', description: 'Cargo Oil Pump', reference: 'COP', parentFunctionNo: '', status: 'In Use', location: 'Pump Room', department: 'Cargo', installedComponentId: 'C-END-1007', criticality: 'High', counter: 'Running Hours',
      sfiCode: '62000000', system: 'Cargo', subSystem: 'Cargo Oil', tagNo: 'COP-1', rotationLog: [{ componentNo: 'C-END-1007', componentName: 'Cargo Oil Pump', action: 'Installed', performedBy: 'A. Admin', performedAt: '2019-11-20' }] }),
    FN({ installation: 'Endeavour', functionNo: 'FN-END-ELE-01', description: 'Main Switchboard', reference: 'MSB', parentFunctionNo: '', status: 'In Use', location: 'Engine Room', department: 'Electrical', installedComponentId: 'C-END-1008', criticality: 'High', counter: 'Load Current',
      sfiCode: '31000000', system: 'Electrical', subSystem: 'Switchboard', tagNo: 'MSB-1', rotationLog: [{ componentNo: 'C-END-1008', componentName: 'Main Switchboard', action: 'Installed', performedBy: 'A. Admin', performedAt: '2019-11-20' }] }),
    FN({ installation: 'Endeavour', functionNo: 'FN-END-ELE-02', description: 'Emergency Generator', reference: 'EG', parentFunctionNo: '', status: 'In Use', location: 'Emergency Gen Room', department: 'Electrical', installedComponentId: 'C-END-1009', criticality: 'High', counter: 'Running Hours',
      sfiCode: '32000000', system: 'Electrical', subSystem: 'Emergency Power', tagNo: 'EG-1', rotationLog: [{ componentNo: 'C-END-1009', componentName: 'Emergency Generator', action: 'Installed', performedBy: 'A. Admin', performedAt: '2019-11-20' }] }),
    FN({ installation: 'Endeavour', functionNo: 'FN-END-DECK-10', description: 'Mooring Winch', reference: 'MWA', parentFunctionNo: '', status: 'In Use', location: 'Fore Deck', department: 'Deck', installedComponentId: 'C-END-1010', criticality: 'Medium', counter: 'Running Hours',
      sfiCode: '13000000', system: 'Hull', subSystem: 'Mooring', tagNo: 'MWA-1', rotationLog: [{ componentNo: 'C-END-1010', componentName: 'Mooring Winch', action: 'Installed', performedBy: 'A. Admin', performedAt: '2019-11-20' }] }),
    FN({ installation: 'Endeavour', functionNo: 'FN-END-CARGO-01', description: 'Cargo Tank No.1', reference: 'CT1', parentFunctionNo: '', status: 'In Use', location: 'Cargo Tank', department: 'Cargo', installedComponentId: 'C-END-1011', criticality: 'Medium', counter: 'Operation Hours',
      sfiCode: '63000000', system: 'Cargo', subSystem: 'Tank', tagNo: 'CT1', rotationLog: [{ componentNo: 'C-END-1011', componentName: 'Cargo Tank No.1', action: 'Installed', performedBy: 'A. Admin', performedAt: '2019-11-20' }] }),
    FN({ installation: 'Endeavour', functionNo: 'FN-END-NAV-01', description: 'Radar / Navigation', reference: 'NAV', parentFunctionNo: '', status: 'In Use', location: 'Bridge', department: 'Bridge', installedComponentId: 'C-END-1012', criticality: 'High', counter: '',
      sfiCode: '81000000', system: 'Navigation', subSystem: 'Radar', tagNo: 'NAV-1', rotationLog: [{ componentNo: 'C-END-1012', componentName: 'Radar / Navigation', action: 'Installed', performedBy: 'A. Admin', performedAt: '2019-11-20' }] }),
    FN({ installation: 'Endeavour', functionNo: 'FN-END-SAF-01', description: 'Fire Detection System', reference: 'FDS', parentFunctionNo: '', status: 'In Use', location: 'Engine Room', department: 'Electrical', installedComponentId: 'C-END-1013', criticality: 'High', counter: '',
      sfiCode: '51000000', system: 'Safety', subSystem: 'Fire', tagNo: 'FDS-1', rotationLog: [{ componentNo: 'C-END-1013', componentName: 'Fire Detection System', action: 'Installed', performedBy: 'A. Admin', performedAt: '2019-11-20' }] }),
    FN({ installation: 'Endeavour', functionNo: 'FN-END-LS-01', description: 'Lifeboat', reference: 'LB', parentFunctionNo: '', status: 'In Use', location: 'Boat Deck', department: 'Deck', installedComponentId: 'C-END-1014', criticality: 'High', counter: '',
      sfiCode: '91000000', system: 'Lifesaving', subSystem: 'Lifeboat', tagNo: 'LB-1', rotationLog: [{ componentNo: 'C-END-1014', componentName: 'Lifeboat', action: 'Installed', performedBy: 'A. Admin', performedAt: '2019-11-20' }] }),
  ],

  // 指南（手册 Component Locations）：组件安装 / 拆卸历史，Functions Performed 标签页数据源。
  // 每次 setFunction（安装 / 拆卸）都会在此留痕，供 Components 窗口 Functions Performed 标签查看。
  componentFunctionHistory: [
    { id: uid('cfh'), componentId: 'co_1001', componentNo: 'C-10001', functionNo: 'FN-ENG-01', functionDescription: 'Main Engine', location: 'Engine Room', action: 'Installed', performedBy: 'A. Admin', performedAt: '2023-04-12' },
    { id: uid('cfh'), componentId: 'co_1002', componentNo: 'C-10002', functionNo: 'FN-ENG-02', functionDescription: 'Auxiliary Boiler A', location: 'Engine Room', action: 'Installed', performedBy: 'A. Admin', performedAt: '2022-11-03' },
    { id: uid('cfh'), componentId: 'co_1003', componentNo: 'C-10003', functionNo: 'FN-ENG-03', functionDescription: 'Auxiliary Boiler B', location: 'Engine Room', action: 'Installed', performedBy: 'A. Admin', performedAt: '2022-11-03' },
  ],

  // 指南（手册 Component Archives）：从其他部门转入的组件，其先前所属部门的历史数据。
  // 三种 archive kind：'component'（组件档案）/ 'transfer'（转移档案）/ 'status'（状态档案）。
  // 仅当系统参数 Create Component Archive on Transfer In = TRUE 时，transferIn 流程会写入此处。
  componentArchives: [
    { id: uid('ca'), componentNo: 'C-10001', kind: 'component', fromDepartment: 'Deck', toDepartment: 'Engine Room', archiveDate: '2023-04-10', data: 'Previous serial WS-77412; installed on Deck Crane FN-DECK-01 until 2023-04-10' },
    { id: uid('ca'), componentNo: 'C-10001', kind: 'transfer', fromDepartment: 'Deck', toDepartment: 'Engine Room', archiveDate: '2023-04-10', data: 'Transferred in via TD-0999; condition: serviceable' },
    { id: uid('ca'), componentNo: 'C-10001', kind: 'status', fromDepartment: 'Deck', toDepartment: 'Engine Room', archiveDate: '2023-04-10', data: 'Prior status: In Use (Deck Crane); no open work orders' },
    { id: uid('ca'), componentNo: 'C-20001', kind: 'component', fromDepartment: 'Cargo', toDepartment: 'Engineering', archiveDate: '2024-01-15', data: 'Previous serial GR-55120; installed on Cargo Pump FN-CARGO-01' },
    { id: uid('ca'), componentNo: 'C-20001', kind: 'transfer', fromDepartment: 'Cargo', toDepartment: 'Engineering', archiveDate: '2024-01-15', data: 'Transferred in via TD-0888' },
  ],

  // 指南（手册 P42 Note）：轮次作业（Rounds）可依赖功能位置——仅当特定组件安装在该功能位置上时，
  // 该轮次作业才处于 Active。拆卸组件（尤其 Scrapped/Transferred）会使依赖它的轮次作业停用（Inactive）。
  // 此处预置若干依赖 Main Engine / Aux Boiler 的轮次作业，用于模拟与测试拆卸时的停用通知。
  roundJobs: [
    { id: uid('rj'), roundCode: 'RND-ENG-01', description: 'Engine Room Daily Round', functionNo: 'FN-ENG-01', componentNo: 'C-10001', status: 'Active' },
    { id: uid('rj'), roundCode: 'RND-ENG-02', description: 'Propulsion Watch Round', functionNo: 'FN-ENG-01', componentNo: 'C-10001', status: 'Active' },
    { id: uid('rj'), roundCode: 'RND-BLR-01', description: 'Boiler Room Round', functionNo: 'FN-ENG-02', componentNo: 'C-10002', status: 'Active' },
  ],

  jobs: [
    { id: uid('jb'), jobNo: 'J-5001', description: 'Overhaul ME Cylinder Liner', targetType: 'ComponentType', targetId: 'CT-1001', frequency: '8000 hrs', planningMethod: 'Counter', dueDate: '2026-07-12', requiredDisciplines: ['Fitter', 'Engineer'], requiredParts: ['P-101', 'P-102'], status: 'Due', jdCode: 'M001', jdRevision: 1, jdTitle: 'ME, MEASURE CRANK DEFLECTION', respDiscipline: 'Engineer', outputFormat: 'Compact List', historyTemplate: 'Standard ME Overhaul', lastDone: '2026-01-10', window: 14, totalDuration: 8, totalCost: 4200, maintCriteria: 'Major', class: 'Class A', trade: 'Mechanical' },
    { id: uid('jb'), jobNo: 'J-5002', description: 'Boiler Annual Survey', targetType: 'ComponentType', targetId: 'CT-1002', frequency: '12 months', planningMethod: 'Periodic', dueDate: '2026-08-01', requiredDisciplines: ['Welder', 'Surveyor'], requiredParts: ['P-201'], status: 'Planned', jdCode: 'S001', jdRevision: 1, jdTitle: 'DNV SURVEY OF MAIN ENGINE', respDiscipline: 'Surveyor', outputFormat: 'Full List', historyTemplate: 'Boiler Survey', lastDone: '2025-08-01', window: 30, totalDuration: 16, totalCost: 9800, maintCriteria: 'Critical', class: 'Class A', trade: 'Welding' },
    { id: uid('jb'), jobNo: 'J-5101', description: 'Pump Bearing Inspection', targetType: 'Component', targetId: 'C-20001', frequency: '4000 hrs', planningMethod: 'Counter', dueDate: '2026-09-15', requiredDisciplines: ['Fitter'], requiredParts: ['P-301'], status: 'Open', jdCode: 'C002', jdRevision: 1, jdTitle: 'ME, CHECK BOLTS TIGHTNESS', respDiscipline: 'Fitter', outputFormat: 'Compact List', historyTemplate: 'Pump Inspection', lastDone: '2026-03-20', window: 7, totalDuration: 4, totalCost: 1200, maintCriteria: 'Minor', class: 'Class B', trade: 'Mechanical' },
  ],

  // 手册 P60：Job Description 库（Look up a Job Description）—— 作业描述模板，供 Component / Type Jobs 查找复用
  // 字段：code（编号）、revision（版本）、title（标题）、frequency（周期）、window（到期浮动窗口）
  jobDescriptions: [
    { id: uid('jd'), code: 'M001', revision: 1, title: 'ME, MEASURE CRANK DEFLECTION', frequency: '6 months', window: 0 },
    { id: uid('jd'), code: 'C002', revision: 1, title: 'ME, CHECK BOLTS TIGHTNESS', frequency: '6 months', window: 0 },
    { id: uid('jd'), code: 'S001', revision: 1, title: 'DNV SURVEY OF MAIN ENGINE', frequency: '60 months', window: 0 },
    { id: uid('jd'), code: 'G001', revision: 2, title: 'GENERAL ENGINE ROUND', frequency: '1 months', window: 2 },
  ],

  workOrders: [
  { id: uid('wo'), workOrderNo: 'WO-260701', description: 'Overhaul ME Cylinder #1', status: 'Requested', dueDate: '2026-07-15', department: 'Engine Room', componentId: 'C-10001', functionNo: 'FN-ENG-01', jobId: 'J-5001', priority: 'High', plannedDate: '' },
  { id: uid('wo'), workOrderNo: 'WO-260702', description: 'Boiler A Annual Survey', status: 'Planned', dueDate: '2026-08-01', department: 'Engine Room', componentId: 'C-10002', functionNo: 'FN-ENG-02', jobId: 'J-5002', priority: 'Medium', plannedDate: '2026-07-20' },
  { id: uid('wo'), workOrderNo: 'WO-260650', description: 'Emergency Pump Repair', status: 'Issued', dueDate: '2026-07-17', department: 'Engineering', componentId: 'C-20001', functionNo: '', jobId: '', priority: 'Critical', plannedDate: '2026-07-03' },
    { id: uid('wo'), workOrderNo: 'WO-260512', description: 'Valve Overhaul', status: 'Completed', dueDate: '2026-06-20', department: 'Deck', componentId: 'C-30001', functionNo: '', jobId: '', priority: 'Low', plannedDate: '2026-06-10' },
  { id: uid('wo'), workOrderNo: 'WO-260480', description: 'ME Liner Inspection', status: 'Postponed', dueDate: '2026-07-10', department: 'Engine Room', componentId: 'C-10001', functionNo: 'FN-ENG-01', jobId: 'J-5001', priority: 'Medium', plannedDate: '' },
  { id: uid('wo'), workOrderNo: 'WO-260703', description: 'ME Liner Running Inspection', status: 'Started', dueDate: '2026-07-18', department: 'Engine Room', componentId: 'C-10001', functionNo: 'FN-ENG-01', jobId: 'J-5001', priority: 'High', plannedDate: '2026-07-05' },

  // ===== MV Voyager（集装箱船）关联工作单 =====
  { id: uid('wo'), workOrderNo: 'WO-261001', description: 'Overhaul ME Cylinder #1 (Voyager)', status: 'Planned', dueDate: '2026-08-10', department: 'Engine Room', componentId: 'C-VOY-1001', functionNo: 'FN-VOY-ENG-01', jobId: '', priority: 'High', plannedDate: '' },
  { id: uid('wo'), workOrderNo: 'WO-261002', description: 'Boiler A Annual Survey (Voyager)', status: 'Requested', dueDate: '2026-09-01', department: 'Engine Room', componentId: 'C-VOY-1002', functionNo: 'FN-VOY-ENG-02', jobId: '', priority: 'Medium', plannedDate: '' },
  { id: uid('wo'), workOrderNo: 'WO-261003', description: 'Aux Engine DG-1 Inspection (Voyager)', status: 'Issued', dueDate: '2026-07-25', department: 'Engine Room', componentId: 'C-VOY-1003', functionNo: 'FN-VOY-ENG-10', jobId: '', priority: 'Medium', plannedDate: '' },
  { id: uid('wo'), workOrderNo: 'WO-261010', description: 'Mooring Winch Greasing (Voyager)', status: 'Open', dueDate: '2026-08-05', department: 'Deck', componentId: 'C-VOY-1010', functionNo: 'FN-VOY-DECK-10', jobId: '', priority: 'Low', plannedDate: '' },

  // ===== MV Endeavour（油轮）关联工作单 =====
  { id: uid('wo'), workOrderNo: 'WO-262001', description: 'Overhaul ME Cylinder #1 (Endeavour)', status: 'Planned', dueDate: '2026-08-15', department: 'Engine Room', componentId: 'C-END-1001', functionNo: 'FN-END-ENG-01', jobId: '', priority: 'High', plannedDate: '' },
  { id: uid('wo'), workOrderNo: 'WO-262002', description: 'Boiler A Survey (Endeavour)', status: 'Open', dueDate: '2026-08-20', department: 'Engine Room', componentId: 'C-END-1002', functionNo: 'FN-END-ENG-02', jobId: '', priority: 'Medium', plannedDate: '' },
  { id: uid('wo'), workOrderNo: 'WO-262007', description: 'Cargo Oil Pump Overhaul (Endeavour)', status: 'Requested', dueDate: '2026-09-10', department: 'Cargo', componentId: 'C-END-1007', functionNo: 'FN-END-ENG-40', jobId: '', priority: 'High', plannedDate: '' },
  { id: uid('wo'), workOrderNo: 'WO-262010', description: 'Mooring Winch Inspection (Endeavour)', status: 'Issued', dueDate: '2026-07-22', department: 'Deck', componentId: 'C-END-1010', functionNo: 'FN-END-DECK-10', jobId: '', priority: 'Low', plannedDate: '' },
],

  // 手册 P36 / P38：Stock Types — 备件主数据（部件类型 Parts tab 通过 lookup 关联）
  // 编号格式参照手册示例 601.03.00.001；原型使用 ST-xxx 简化格式
  stockTypes: [
    { id: uid('st'), stockTypeNo: 'ST-101', description: 'Cylinder Liner Gasket', maker: 'WART', makersRef: '1698466', parentTypeNo: '', perishable: false, stockClass: 'Spare Part', vendor: 'Wärtsilä Marine', grade: 'A', unit: 'pcs', bestPrice: 320, status: 'Active' },
    { id: uid('st'), stockTypeNo: 'ST-102', description: 'Piston Ring Set', maker: 'WART', makersRef: '79613003', parentTypeNo: '', perishable: false, stockClass: 'Spare Part', vendor: 'Wärtsilä Marine', grade: 'A', unit: 'set', bestPrice: 890, status: 'Active' },
    { id: uid('st'), stockTypeNo: 'ST-103', description: 'Cylinder Liner', maker: 'WART', makersRef: '87971491', parentTypeNo: '', perishable: false, stockClass: 'Spare Part', vendor: 'Wärtsilä Marine', grade: 'A', unit: 'pcs', bestPrice: 4200, status: 'Active' },
    { id: uid('st'), stockTypeNo: 'ST-201', description: 'Boiler Safety Valve', maker: 'AALB', vendor: 'Alfa Laval', grade: 'A', unit: 'pcs', bestPrice: 1850, status: 'Active' },
    { id: uid('st'), stockTypeNo: 'ST-202', description: 'Boiler Water Gauge Glass', maker: 'AALB', vendor: 'Alfa Laval', grade: 'B', unit: 'pcs', bestPrice: 45, status: 'Active' },
    { id: uid('st'), stockTypeNo: 'ST-203', description: 'Burner Nozzle Assembly', maker: 'AALB', vendor: 'Alfa Laval', grade: 'A', unit: 'pcs', bestPrice: 680, status: 'Active' },
    { id: uid('st'), stockTypeNo: 'ST-301', description: 'Pump Mechanical Seal', maker: 'GRUN', vendor: 'Grundfos', grade: 'B', unit: 'set', bestPrice: 145, status: 'Active' },
    { id: uid('st'), stockTypeNo: 'ST-302', description: 'Pump Impeller', maker: 'GRUN', vendor: 'Grundfos', grade: 'B', unit: 'pcs', bestPrice: 280, status: 'Active' },
    { id: uid('st'), stockTypeNo: 'ST-303', description: 'Pump Shaft Sleeve', maker: 'GRUN', vendor: 'Grundfos', grade: 'C', unit: 'pcs', bestPrice: 95, status: 'Active' },
    { id: uid('st'), stockTypeNo: 'ST-401', description: 'Engine Lube Oil 40', maker: 'SHELL', makersRef: 'SH-LO40', parentTypeNo: '', perishable: true, stockClass: 'Consumable', vendor: 'Shell Marine', grade: 'C', unit: 'L', bestPrice: 6.4, status: 'Active' },
    { id: uid('st'), stockTypeNo: 'ST-402', description: 'Valve Seat Ring', maker: 'TYCO', vendor: 'Tyco International', grade: 'B', unit: 'pcs', bestPrice: 175, status: 'Active' },
    { id: uid('st'), stockTypeNo: 'ST-403', description: 'Butterfly Disc', maker: 'TYCO', vendor: 'Tyco International', grade: 'B', unit: 'pcs', bestPrice: 220, status: 'Active' },
    { id: uid('st'), stockTypeNo: 'ST-501', description: 'Hydraulic Ram Seal Kit', maker: 'RRM', vendor: 'Rolls-Royce Marine', grade: 'A', unit: 'kit', bestPrice: 560, status: 'Active' },
    { id: uid('st'), stockTypeNo: 'ST-502', description: 'Steering Gear Oil', maker: 'SHELL', makersRef: 'SH-SGO', parentTypeNo: '', perishable: true, stockClass: 'Consumable', vendor: 'Shell Marine', grade: 'C', unit: 'L', bestPrice: 8.2, status: 'Active' },
    { id: uid('st'), stockTypeNo: 'ST-601', description: 'Plate Heat Exchanger Gasket', maker: 'SWEP', vendor: 'SWEP International', grade: 'A', unit: 'set', bestPrice: 380, status: 'Active' },
    { id: uid('st'), stockTypeNo: 'ST-701', description: 'ACB Main Contacts', maker: 'ABBM', vendor: 'ABB Marine', grade: 'A', unit: 'set', bestPrice: 1200, status: 'Active' },
    { id: uid('st'), stockTypeNo: 'ST-702', description: 'Synchroscope Lamp', maker: 'ABBM', vendor: 'ABB Marine', grade: 'C', unit: 'pcs', bestPrice: 28, status: 'Active' },
    { id: uid('st'), stockTypeNo: 'ST-801', description: 'Fuel Filter Element', maker: 'CUMM', vendor: 'Cummins Inc.', grade: 'B', unit: 'pcs', bestPrice: 85, status: 'Active' },
    { id: uid('st'), stockTypeNo: 'ST-802', description: 'Starter Motor Relay', maker: 'CUMM', vendor: 'Cummins Inc.', grade: 'B', unit: 'pcs', bestPrice: 165, status: 'Active' },
    { id: uid('st'), stockTypeNo: 'ST-901', description: 'Winch Brake Lining', maker: 'MACG', vendor: 'MacGregor / Cargotec', grade: 'B', unit: 'set', bestPrice: 340, status: 'Active' },
    { id: uid('st'), stockTypeNo: 'ST-902', description: 'Wire Rope (Per Meter)', maker: 'USHA', vendor: 'MacGregor / Cargotec', grade: 'A', unit: 'm', bestPrice: 42, status: 'Active' },
  ],

  // 手册 P181：Stock Type 的 Makers（合格制造商清单）/ Vendors（合格供应商清单）/ Grades（库存等级）为可编辑子表
  stockTypeMakers: [
    { id: uid('stm'), stockTypeNo: 'ST-101', maker: 'WART', makersRef: '1698466', price: 310, status: 'Approved' },
    { id: uid('stm'), stockTypeNo: 'ST-101', maker: 'ABBM', makersRef: 'ABB-GSK-101', price: 305, status: 'Pending' },
    { id: uid('stm'), stockTypeNo: 'ST-401', maker: 'SHELL', makersRef: 'SH-LO40', price: 6.2, status: 'Approved' },
    { id: uid('stm'), stockTypeNo: 'ST-701', maker: 'ABBM', makersRef: 'ABB-ACB-701', price: 1180, status: 'Approved' },
  ],
  stockTypeVendors: [
    { id: uid('stv'), stockTypeNo: 'ST-101', vendor: 'Wärtsilä Marine', price: 320, leadTime: 30, status: 'Approved' },
    { id: uid('stv'), stockTypeNo: 'ST-101', vendor: 'ABB Marine', price: 315, leadTime: 45, status: 'Pending' },
    { id: uid('stv'), stockTypeNo: 'ST-401', vendor: 'Shell Marine', price: 6.4, leadTime: 21, status: 'Approved' },
    { id: uid('stv'), stockTypeNo: 'ST-701', vendor: 'ABB Marine', price: 1200, leadTime: 40, status: 'Approved' },
  ],
  stockGrades: [
    { id: uid('sg'), stockTypeNo: 'ST-101', grade: 'A', priceFactor: 1.0, description: 'OEM original' },
    { id: uid('sg'), stockTypeNo: 'ST-101', grade: 'B', priceFactor: 0.85, description: 'Certified equivalent' },
    { id: uid('sg'), stockTypeNo: 'ST-401', grade: 'C', priceFactor: 1.0, description: 'Standard grade' },
    { id: uid('sg'), stockTypeNo: 'ST-701', grade: 'A', priceFactor: 1.0, description: 'OEM original' },
  ],

  // 指南（手册 3）：库存项状态为 Active / Obsolete / Scrapped（短缺由数量 / 重订水平决定，非状态）
  stockItems: [
    { id: uid('si'), stockItemNo: 'SI-001', stockTypeNo: 'ST-101', description: 'Cylinder Liner Gasket', makerRef: 'WS-GSK-101', drawingNo: 'DW-ENG-001', stockClass: 'Gasket', functionNo: 'FN-ENG-01', quantity: 12, department: 'Engine Room', location: 'ER-Store-A', expiryDate: '', perishable: false, status: 'Active', unitCost: 320 },
    { id: uid('si'), stockItemNo: 'SI-002', stockTypeNo: 'ST-201', description: 'Boiler Safety Valve', makerRef: 'AL-SV-201', drawingNo: 'DW-BLR-201', stockClass: 'Valve', functionNo: 'FN-ENG-02', quantity: 2, department: 'Engine Room', location: 'ER-Store-B', expiryDate: '', perishable: false, status: 'Active', unitCost: 1850 },
    { id: uid('si'), stockItemNo: 'SI-003', stockTypeNo: 'ST-301', description: 'Pump Mechanical Seal', makerRef: 'GR-SEAL-301', drawingNo: 'DW-PMP-301', stockClass: 'Seal', functionNo: '', quantity: 8, department: 'Engineering', location: 'ER-Store-A', expiryDate: '', perishable: false, status: 'Active', unitCost: 145 },
    { id: uid('si'), stockItemNo: 'SI-004', stockTypeNo: 'ST-401', description: 'Engine Lube Oil 40', makerRef: 'SH-LO-401', drawingNo: 'DW-TNK-401', stockClass: 'Lubricant', functionNo: '', quantity: 450, department: 'Engine Room', location: 'Tank-T1', expiryDate: '2027-12-01', perishable: true, status: 'Active', unitCost: 6.4 },
  { id: uid('si'), stockItemNo: 'SI-005', stockTypeNo: 'ST-101', description: 'Cylinder Liner Gasket', makerRef: 'WS-GSK-101', drawingNo: 'DW-ENG-001', stockClass: 'Gasket', functionNo: 'FN-ENG-01', quantity: 0, department: 'Purchasing', location: 'ER-Store-A', expiryDate: '', perishable: false, status: 'Active', unitCost: 320 },

  // ===== MV Voyager 库存 =====
  { id: uid('si'), stockItemNo: 'SI-V001', stockTypeNo: 'ST-101', description: 'Cylinder Liner Gasket', makerRef: 'WS-GSK-101V', drawingNo: 'DW-ENG-001', stockClass: 'Gasket', functionNo: 'FN-VOY-ENG-01', quantity: 10, department: 'Engine Room', location: 'Voyager-ER-Store', expiryDate: '', perishable: false, status: 'Active', unitCost: 320 },
  { id: uid('si'), stockItemNo: 'SI-V002', stockTypeNo: 'ST-201', description: 'Boiler Safety Valve', makerRef: 'AL-SV-201V', drawingNo: 'DW-BLR-201', stockClass: 'Valve', functionNo: 'FN-VOY-ENG-02', quantity: 3, department: 'Engine Room', location: 'Voyager-ER-Store', expiryDate: '', perishable: false, status: 'Active', unitCost: 1850 },
  { id: uid('si'), stockItemNo: 'SI-V003', stockTypeNo: 'ST-301', description: 'Pump Mechanical Seal', makerRef: 'GR-SEAL-301V', drawingNo: 'DW-PMP-301', stockClass: 'Seal', functionNo: '', quantity: 6, department: 'Engineering', location: 'Voyager-Store', expiryDate: '', perishable: false, status: 'Active', unitCost: 145 },
  { id: uid('si'), stockItemNo: 'SI-V004', stockTypeNo: 'ST-401', description: 'Engine Lube Oil 40', makerRef: 'SH-LO-401V', drawingNo: 'DW-TNK-401', stockClass: 'Lubricant', functionNo: '', quantity: 380, department: 'Engine Room', location: 'Voyager-Tank', expiryDate: '2027-10-01', perishable: true, status: 'Active', unitCost: 6.4 },

  // ===== MV Endeavour 库存 =====
  { id: uid('si'), stockItemNo: 'SI-E001', stockTypeNo: 'ST-101', description: 'Cylinder Liner Gasket', makerRef: 'WS-GSK-101E', drawingNo: 'DW-ENG-001', stockClass: 'Gasket', functionNo: 'FN-END-ENG-01', quantity: 8, department: 'Engine Room', location: 'Endeavour-ER-Store', expiryDate: '', perishable: false, status: 'Active', unitCost: 320 },
  { id: uid('si'), stockItemNo: 'SI-E002', stockTypeNo: 'ST-201', description: 'Boiler Safety Valve', makerRef: 'AL-SV-201E', drawingNo: 'DW-BLR-201', stockClass: 'Valve', functionNo: 'FN-END-ENG-02', quantity: 2, department: 'Engine Room', location: 'Endeavour-ER-Store', expiryDate: '', perishable: false, status: 'Active', unitCost: 1850 },
  { id: uid('si'), stockItemNo: 'SI-E003', stockTypeNo: 'ST-301', description: 'Pump Mechanical Seal', makerRef: 'GR-SEAL-301E', drawingNo: 'DW-PMP-301', stockClass: 'Seal', functionNo: 'FN-END-ENG-40', quantity: 5, department: 'Cargo', location: 'Endeavour-Store', expiryDate: '', perishable: false, status: 'Active', unitCost: 145 },
  { id: uid('si'), stockItemNo: 'SI-E004', stockTypeNo: 'ST-401', description: 'Engine Lube Oil 40', makerRef: 'SH-LO-401E', drawingNo: 'DW-TNK-401', stockClass: 'Lubricant', functionNo: '', quantity: 300, department: 'Engine Room', location: 'Endeavour-Tank', expiryDate: '2027-08-15', perishable: true, status: 'Active', unitCost: 6.4 },
],

  // 指南（手册 3）：Wanted 基于 Reorder Level，并扣减已申请未到货（Outstanding）与关联组件（For Component）
  stockWanted: [
    { id: uid('sw'), stockTypeNo: 'ST-101', description: 'Cylinder Liner Gasket', currentQty: 12, reorderLevel: 20, outstanding: 0, wantedQty: 8, forComponent: 'FN-ENG-01', vendor: 'Wärtsilä Marine', contract: 'C-2026-01' },
    { id: uid('sw'), stockTypeNo: 'ST-301', description: 'Pump Mechanical Seal', currentQty: 8, reorderLevel: 15, outstanding: 0, wantedQty: 7, forComponent: 'FN-DECK-01', vendor: 'Grundfos', contract: 'C-2026-02' },
  { id: uid('sw'), stockTypeNo: 'ST-201', description: 'Boiler Safety Valve', currentQty: 2, reorderLevel: 4, outstanding: 1, wantedQty: 2, forComponent: 'FN-ENG-02', vendor: 'Alfa Laval', contract: '' },
  { id: uid('sw'), stockTypeNo: 'ST-101', description: 'Cylinder Liner Gasket', currentQty: 10, reorderLevel: 20, outstanding: 0, wantedQty: 10, forComponent: 'FN-VOY-ENG-01', vendor: 'Wärtsilä Marine', contract: '' },
  { id: uid('sw'), stockTypeNo: 'ST-301', description: 'Pump Mechanical Seal', currentQty: 5, reorderLevel: 12, outstanding: 0, wantedQty: 7, forComponent: 'FN-END-ENG-40', vendor: 'Grundfos', contract: '' },
],

  transactions: [
    { id: uid('tx'), transactionNo: 'TX-9001', type: 'In', stockItem: 'SI-001', quantity: 20, fromLocation: '', toLocation: 'ER-Store-A', date: '2026-06-28', reference: 'GRN-220' },
    { id: uid('tx'), transactionNo: 'TX-9002', type: 'Out', stockItem: 'SI-003', quantity: 3, fromLocation: 'ER-Store-A', toLocation: 'WO-260650', date: '2026-07-04', reference: 'WO-260650' },
  { id: uid('tx'), transactionNo: 'TX-9003', type: 'Move', stockItem: 'SI-002', quantity: 1, fromLocation: 'ER-Store-B', toLocation: 'ER-Store-A', date: '2026-07-06', reference: 'MV-31' },
  { id: uid('tx'), transactionNo: 'TX-9101', type: 'In', stockItem: 'SI-V001', quantity: 15, fromLocation: '', toLocation: 'Voyager-ER-Store', date: '2026-06-25', reference: 'GRN-V01' },
  { id: uid('tx'), transactionNo: 'TX-9102', type: 'Out', stockItem: 'SI-E003', quantity: 2, fromLocation: 'Endeavour-Store', toLocation: 'WO-262007', date: '2026-07-05', reference: 'WO-262007' },
  { id: uid('tx'), transactionNo: 'TX-9103', type: 'In', stockItem: 'SI-E001', quantity: 12, fromLocation: '', toLocation: 'Endeavour-ER-Store', date: '2026-06-20', reference: 'GRN-E01' },
],

  transferDocs: [
    { id: uid('td'), docNo: 'TD-1001', fromLocation: 'ER-Store-A', toLocation: 'Deck-Store', status: 'Approved', items: 3, created: '2026-07-01' },
    { id: uid('td'), docNo: 'TD-1002', fromLocation: 'Store', toLocation: 'ER-Store-A', status: 'Created', items: 1, created: '2026-07-08' },
  ],

  purchaseForms: [
    { id: uid('pf'), formNo: 'REQ-26001', type: 'Requisition', status: 'Draft', vendor: '', deliveryLocation: 'ER-Store-A', contract: '', createdDate: '2026-07-02', lineItems: [
      { id: uid('li'), partNo: 'ST-101', description: 'Cylinder Liner Gasket', quantity: 8, unitPrice: 320, currency: 'USD' },
    ], total: 2560 },
    { id: uid('pf'), formNo: 'QRY-26010', type: 'Query', status: 'Issued', vendor: 'Wärtsilä Marine', deliveryLocation: 'ER-Store-A', contract: '', createdDate: '2026-07-03', lineItems: [
      { id: uid('li'), partNo: 'ST-201', description: 'Boiler Safety Valve', quantity: 2, unitPrice: 1850, currency: 'USD' },
    ], total: 3700 },
    { id: uid('pf'), formNo: 'PO-26055', type: 'PurchaseOrder', status: 'Approved', vendor: 'Alfa Laval', deliveryLocation: 'ER-Store-B', contract: 'C-2026-03', createdDate: '2026-06-25', lineItems: [
      { id: uid('li'), partNo: 'ST-201', description: 'Boiler Safety Valve', quantity: 2, unitPrice: 1800, currency: 'USD' },
    ], total: 3600 },
    { id: uid('pf'), formNo: 'PO-26060', type: 'PurchaseOrder', status: 'Partly Delivered', vendor: 'Grundfos', deliveryLocation: 'ER-Store-A', contract: 'C-2026-02', createdDate: '2026-06-30', lineItems: [
      { id: uid('li'), partNo: 'ST-301', description: 'Pump Mechanical Seal', quantity: 7, unitPrice: 142, currency: 'USD' },
    ], total: 994 },
  ],

  quotations: [
    { id: uid('qt'), formNo: 'QRY-26010', vendor: 'Wärtsilä Marine', unitPrice: 1850, discount: 0, additionalCost: 0, deliveryDays: 30, currency: 'USD', note: 'Stock available' },
    { id: uid('qt'), formNo: 'QRY-26010', vendor: 'Alfa Laval', unitPrice: 1810, discount: 2, additionalCost: 50, deliveryDays: 35, currency: 'USD', note: 'Alternative brand' },
  ],

  deliveries: [
    { id: uid('dv'), deliveryNo: 'DEL-7001', formNo: 'PO-26060', status: 'Partly Received', lineItems: 1, intermediate: '', date: '2026-07-07' },
    { id: uid('dv'), deliveryNo: 'DEL-7002', formNo: 'PO-26055', status: 'In Transit', lineItems: 1, intermediate: 'Rotterdam', date: '2026-07-09' },
  ],

  transportDocs: [
    { id: uid('tp'), docNo: 'TRP-5001', deliveries: 'DEL-7002', intermediate: 'Rotterdam', status: 'Consolidated', created: '2026-07-08' },
  ],

  qualityChecks: [
    { id: uid('qc'), checkNo: 'QC-3001', formNo: 'PO-26055', status: 'Passed', result: 'Accept', claim: 'No', items: 1, date: '2026-07-09' },
    { id: uid('qc'), checkNo: 'QC-3002', formNo: 'PO-26060', status: 'Open', result: '', claim: 'No', items: 1, date: '2026-07-09' },
  ],

  contracts: [
    { id: uid('pc'), contractNo: 'C-2026-01', title: 'Liner Gasket Framework', vendor: 'Wärtsilä Marine', status: 'Issued', discount: '3%', deliveryZone: 'EU', priceMatrix: 'ST-101 / 312' },
    { id: uid('pc'), contractNo: 'C-2026-02', title: 'Pump Spares Agreement', vendor: 'Grundfos', status: 'Issued', discount: '5%', deliveryZone: 'Global', priceMatrix: 'ST-301 / 138' },
    { id: uid('pc'), contractNo: 'C-2026-03', title: 'Boiler Parts Supply', vendor: 'Alfa Laval', status: 'Approved', discount: '2%', deliveryZone: 'EU', priceMatrix: 'ST-201 / 1780' },
  ],

  // 指南（手册 5）：预算状态为 Preliminary / Approved / Parked；Access 为 Open / Restricted（与状态独立）
  budgets: [
    { id: uid('bg'), code: 'BG-PUR-2026', title: 'Purchase Budget 2026', groupCode: 'FIN', class: 'Purchase', model: 'Manual', status: 'Preliminary', access: 'Open', warning: 80, limit: 500000, committed: 184560, paid: 120300, forecast: 240000 },
    { id: uid('bg'), code: 'BG-STK-2026', title: 'Stock Budget 2026', groupCode: 'FIN', class: 'Stock', model: 'Manual', status: 'Approved', access: 'Open', warning: 80, limit: 200000, committed: 64200, paid: 51000, forecast: 90000 },
    { id: uid('bg'), code: 'BG-MNT-2026', title: 'Maintenance Budget 2026', groupCode: 'FIN', class: 'Maintenance', model: 'Manual', status: 'Preliminary', access: 'Restricted', warning: 90, limit: 350000, committed: 268900, paid: 199000, forecast: 310000 },
  ],

  // 指南（手册 5）：凭证通过 workflow 流转，无 "Open" 状态；可为多张采购单关联（forms 数组）
  vouchers: [
    { id: uid('vc'), voucherNo: 'VC-8001', vendor: 'Alfa Laval', formNos: ['PO-26055'], status: 'Posted', type: 'Invoice', transaction: 'Payable', budgetCode: 'BG-PUR-2026', currency: 'USD', reference: 'INV-55012', net: 3600, vat: 612, total: 4212, date: '2026-07-09', lineItems: [{ id: uid('li'), description: 'Boiler Safety Valve', quantity: 2, unitPrice: 1800 }] },
    { id: uid('vc'), voucherNo: 'VC-8002', vendor: 'Grundfos', formNos: ['PO-26060'], status: 'Approved', type: 'Invoice', transaction: 'Payable', budgetCode: 'BG-MNT-2026', currency: 'USD', reference: 'INV-56001', net: 994, vat: 169, total: 1163, date: '2026-07-09', lineItems: [{ id: uid('li'), description: 'Pump Mechanical Seal', quantity: 7, unitPrice: 142 }] },
  ],

  counterLogs: [
    { id: uid('cl'), component: 'C-10001', function: 'FN-ENG-01', counter: 'Running Hours', currentValue: 78200, newValue: 79000, unit: 'hrs', readingDate: '2026-07-09' },
    { id: uid('cl'), component: 'C-10002', function: 'FN-ENG-02', counter: 'Fired Hours', currentValue: 41200, newValue: 41800, unit: 'hrs', readingDate: '2026-07-09' },
  ],

  measureLogs: [
    { id: uid('ml'), component: 'C-10002', function: 'FN-ENG-02', measurePoint: 'Boiler Pressure', value: 9.8, trend: 'Stable', readingDate: '2026-07-09' },
    { id: uid('ml'), component: 'C-10002', function: 'FN-ENG-02', measurePoint: 'Flue Temp', value: 215, trend: 'Up', readingDate: '2026-07-09' },
  ],

  projects: [
    { id: uid('pj'), projectNo: 'PRJ-2026-A', title: 'Main Engine Overhaul Campaign', status: 'Active', sections: 3, jobs: 12, workOrders: 9, cost: 142000 },
  ],

  // 指南（手册 2 / Report Work）：Maintenance History 与 Maintenance Log 展示“汇报历史”，而非工单列表
  maintenanceLog: [
    { id: uid('hl'), date: '2026-06-20', workOrder: 'WO-260512', job: 'J-5101', jobState: 'Completed', reportedBy: 'A. Admin', text: 'Valve overhaul completed; new gasket fitted.' },
    { id: uid('hl'), date: '2026-07-04', workOrder: 'WO-260650', job: 'J-5001', jobState: 'PartlyDone', reportedBy: 'J. Smith', text: 'Emergency pump repair; awaiting spare mechanical seal.' },
    { id: uid('hl'), date: '2026-07-09', workOrder: 'WO-260701', job: 'J-5001', jobState: 'Completed', reportedBy: 'A. Admin', text: 'ME cylinder liner overhaul completed; counter updated.' },
  ],

  // 手册 Working with Functions：Location 作为编码 + 描述的主数据，供 New Location / Function Location 等 lookup 使用
  locations: [],
})

// 初始化 Location 主数据：从现有组件 / 功能位置的 location 字段派生，避免丢失已有位置
if (!db.locations.length) {
  db.locations = Array.from(
    new Set([...db.components.map((c) => c.location), ...db.functions.map((f) => f.location)])
  ).filter(Boolean).map((l) => ({ id: uid('loc'), code: l, description: l }))
}

// 手册 P59：为已存在的 mock 组件补种「继承作业」。
// 注册流程中 componentService.register 已自动继承；此处为初始数据（未经过注册流程）的组件补齐，
// 确保 Components 窗口 Jobs 标签开箱即有继承数据。本地实现以避免与 jobService 形成循环依赖。
;(function seedInheritedJobs() {
  const LINKABLE = ['description', 'frequency', 'planningMethod', 'counterCode', 'measurePointCode', 'dueDate', 'active', 'jdCode', 'jdRevision', 'jdTitle', 'respDiscipline', 'outputFormat', 'historyTemplate', 'lastDone', 'window', 'totalDuration', 'totalCost', 'maintCriteria', 'class', 'trade']
  db.components.forEach((c) => {
    if (!c.typeNumber) return
    const typeJobs = db.jobs.filter((j) => j.targetType === 'ComponentType' && j.targetId === c.typeNumber)
    const inherited = new Set(
      db.jobs.filter((j) => j.targetType === 'Component' && j.targetId === c.number).map((j) => j.inheritedFrom),
    )
    typeJobs.forEach((tj) => {
      if (inherited.has(tj.jobNo)) return
      db.jobs.push({
        id: uid('jb'),
        // 手册 P59-61：继承作业编号从「父类型作业号 @ 组件号」派生，确定性且可追溯来源，避免随机号碰撞
        jobNo: `${tj.jobNo}@${c.number}`,
        description: tj.description,
        targetType: 'Component',
        targetId: c.number,
        frequency: tj.frequency || '',
        planningMethod: tj.planningMethod || 'Periodic',
        counterCode: tj.counterCode || '',
        measurePointCode: tj.measurePointCode || '',
        dueDate: tj.dueDate || '',
        active: tj.active || 'Yes',
        status: tj.status || 'Planned',
        inheritedFrom: tj.jobNo,
        linkedFields: [...LINKABLE],
        relatedJobs: [],
        dependencies: [],
      })
    })
  })
})()

// ===== 派生查询列表（供 Lookup 使用） =====
export const lookups = {
  componentTypes: () => db.componentTypes.map((c) => ({ code: c.typeNumber, label: `${c.typeNumber} — ${c.name}` })),
  // Component Type Model 选择器：取所有组件类型 model 去重（排除自身由调用方无关，这里仅提供候选集）
  componentTypeModels: () => [...new Set((db.componentTypes || []).map((c) => c.model).filter((m) => m && m.trim()))].map((m) => ({ code: m, label: m })),
  // 父组件 / 依赖组件选择器：列出已有组件；排除当前记录自身（避免自引用 / 层级成环）
  components: (model) => (db.components || []).filter((c) => !model || !model.number || c.number !== model.number).map((c) => ({ code: c.number, label: `${c.number} — ${c.name}` })),
  functions: () => db.functions.map((f) => ({ code: f.functionNo, label: `${f.functionNo} — ${f.description}` })),
  // 手册 Working with Functions：Location 字段使用编码 + 描述的 lookup（来源：db.locations 主数据）
  // 前端联调：优先用后端 location_register（code/name）；缓存为空时回落本地 Mock
  locations: () => session.registerCache.locations.length
    ? session.registerCache.locations.map((l) => ({ code: l.code, label: l.name && l.name !== l.code ? `${l.code} — ${l.name}` : l.code }))
    : db.locations.map((l) => ({ code: l.code, label: l.description && l.description !== l.code ? `${l.code} — ${l.description}` : l.code })),
  stockTypes: () => db.stockTypes.map((s) => ({ code: s.stockTypeNo, label: `${s.stockTypeNo} — ${s.description}` })),
  stockItems: () => db.stockItems.map((s) => ({ code: s.stockItemNo, label: `${s.stockItemNo} — ${s.description}` })),
  // 手册 P181-182：Preferred Vendor 定位到 Address Register（商业伙伴）。
  // 前端联调：优先用后端 vendor_register（键 vendorNo）；缓存为空时回落本地 Mock
  vendors: () => session.registerCache.vendors.length
    ? session.registerCache.vendors.map((v) => ({ code: v.vendorNo, label: v.name }))
    : [...new Set(db.stockTypes.map((s) => s.vendor).filter(Boolean))].sort().map((v) => ({ code: v, label: v })),
  contracts: () => db.contracts.map((c) => ({ code: c.contractNo, label: `${c.contractNo} — ${c.title}` })),
  budgets: () => db.budgets.map((b) => ({ code: b.code, label: `${b.code} — ${b.title}` })),
  // 手册 P44：Component Jobs 中，Counter Code 下拉仅列出该组件自身已登记的计数器
  componentJobCounters: (model) => {
    const c = db.components.find((x) => x.number === (model && model.targetId))
    return (c?.componentCounters || []).map((cc) => ({ code: cc.code, label: `${cc.code} — ${cc.description}` }))
  },
  // 手册 P44：Component Type Jobs 中，Counter Code 下拉仅列出该类型自身已定义的计数器模板
  componentTypeJobCounters: (model) => {
    const ct = db.componentTypes.find((x) => x.typeNumber === (model && model.targetId))
    return (ct?.counters || []).map((cc) => ({ code: cc.code, label: `${cc.code} — ${cc.description}` }))
  },
  // 手册 P45：Component Jobs 中，Measure Point 下拉仅列出该组件自身已登记的测点（先列在组件上才可选）
  componentJobMeasurePoints: (model) => {
    const c = db.components.find((x) => x.number === (model && model.targetId))
    if (!c) return []
    // 优先取组件级已登记测点；尚未在 Components 窗口选中继承时，回退到其类型的测点模板
    const list = (c.componentMeasurePoints && c.componentMeasurePoints.length)
      ? c.componentMeasurePoints
      : (db.componentTypes.find((t) => t.typeNumber === c.typeNumber)?.measurePointDefs || [])
    return list.map((m) => ({ code: m.code, label: `${m.code} — ${m.description}` }))
  },
  // 手册 P45：Component Type Jobs 中，Measure Point 下拉仅列出该类型自身已定义的测点模板
  componentTypeJobMeasurePoints: (model) => {
    const ct = db.componentTypes.find((x) => x.typeNumber === (model && model.targetId))
    return (ct?.measurePointDefs || []).map((m) => ({ code: m.code, label: `${m.code} — ${m.description}` }))
  },
  // 手册 P44-46：Function Criticality 注册表（degree 列表 + 颜色），驱动 Criticality 下拉与颜色编码指示器
  // 前端联调：优先用后端 function_criticality（degree/description/color）；缓存为空时回落本地 Mock
  criticalities: () => session.registerCache.functionCriticalities.length
    ? session.registerCache.functionCriticalities.map((c) => ({ code: c.degree, label: c.description, color: c.color }))
    : db.functionCriticalities.map((c) => ({ code: c.code, label: c.description, color: c.color })),
  // 手册 P64-65：Related Jobs —— 同类型 / 同组件下的其它作业（排除自身）
  jobsForType: (model) => db.jobs
    .filter((j) => j.targetType === model?.targetType && j.targetId === model?.targetId && j.jobNo !== model?.jobNo)
    .map((j) => ({ code: j.jobNo, label: `${j.jobNo} — ${j.description}` })),
  // 手册 P60：Job Description 库查找（Look up a Job Description）—— 编号 + 标题，并携带 revision / title 供选中后自动带出
  jobDescriptions: () => db.jobDescriptions.map((j) => ({ code: j.code, label: `${j.code} — ${j.title}`, revision: j.revision, title: j.title })),
  // 手册 P147：Resp. Discipline —— 负责工种（子承包时必填），来源 Disciplines 寄存器
  // 前端联调：优先用后端 discipline 表（code/name）；缓存为空时回落本地 Mock
  disciplines: () => session.registerCache.disciplines.length
    ? session.registerCache.disciplines.map((d) => ({ code: d.code, label: d.name }))
    : ['Fitter', 'Engineer', 'Welder', 'Surveyor', 'Electrical', 'Hydraulic', 'Bosun'].map((d) => ({ code: d, label: d })),
  // 手册 P71：History Template —— Report Work 阶段历史记录模板（MandatoryHistory 时可选）
  historyTemplates: () => ['Standard ME Overhaul', 'Boiler Survey', 'Pump Inspection', 'General Round', 'DNV Survey'].map((t) => ({ code: t, label: t })),
  // 手册（截图 P51）：Maint. Criteria —— 维护准则分级
  maintCriteria: () => ['Critical', 'Major', 'Minor', 'Routine'].map((c) => ({ code: c, label: c })),
  jobsForComponent: (model) => db.jobs
    .filter((j) => j.targetType === 'Component' && j.targetId === model?.targetId && j.jobNo !== model?.jobNo)
    .map((j) => ({ code: j.jobNo, label: `${j.jobNo} — ${j.description}` })),
  // 手册 P65-68：Job Dependencies —— 依赖链候选：同组件、非 Counter 作业、且与当前作业同频率 / 同计划方法
  jobsForDependency: (model) => db.jobs
    .filter((j) => j.targetType === 'Component' && j.targetId === model?.targetId && j.jobNo !== model?.jobNo
      && j.planningMethod !== 'Counter' && j.planningMethod === model?.planningMethod && j.frequency === model?.frequency)
    .map((j) => ({ code: j.jobNo, label: `${j.jobNo} — ${j.description}` })),
  // 手册 P181-182（截图）：Maker 定位到 Address Register（商业伙伴）。
  // lookup-with-name 模式：code=短编码（如 WART），label=全称（如 Wärtsilä），匹配手册 TOW001/TOWIMOR SA 样式。
  // 同时维护 makerNameMap 供子表等需要反向解析名称的场景使用。
  makerRegistry: [
    { code: 'WART', name: 'Wärtsilä' }, { code: 'SHELL', name: 'Shell' }, { code: 'ABBM', name: 'ABB Marine' },
    { code: 'ALFA', name: 'Alfa Laval' }, { code: 'AALB', name: 'Aalborg' }, { code: 'GRUN', name: 'Grundfos' },
    { code: 'TYCO', name: 'Tyco International' }, { code: 'RRM', name: 'Rolls-Royce Marine' },
    { code: 'SWEP', name: 'SWEP International' }, { code: 'MANE', name: 'MAN Energy Solutions' },
    { code: 'CUMM', name: 'Cummins Inc.' }, { code: 'MACG', name: 'MacGregor / Cargotec' },
    { code: 'USHA', name: 'Usha Martin' }, { code: 'CARR', name: 'Carrier Corporation' },
    { code: 'SCHAT', name: 'Schat-Harding' }, { code: 'KIDDE', name: 'Kidde (Carrier Fire Products)' },
    { code: 'FURU', name: 'Furuno Electric' }, { code: 'TTS', name: 'TTS (MacGregor Group)' },
    { code: 'MANB', name: 'MAN B&W DIESEL A/S' },
  ],
  // 前端联调：优先用后端 maker_register；缓存为空时回落本地 Mock
  makers: () => session.registerCache.makers.length
    ? session.registerCache.makers.map((m) => ({ code: m.code, label: m.name }))
    : db.makerRegistry.map((m) => ({ code: m.code, label: m.name })),
  // 手册 Chapter 4 / Stock：Units —— 计量单位，被 stock_types / stock_items 的 unit 引用
  // 前端联调：优先用后端 unit_register；缓存为空时回落本地 Mock
  units: () => session.registerCache.units.length
    ? session.registerCache.units.map((u) => ({ code: u.code, label: u.name || u.code }))
    : ['pcs', 'set', 'kg', 'L', 'm', 'box', 'kit', 'roll'].map((u) => ({ code: u, label: u })),
  // 手册 Chapter 4 / Purchasing：Currencies —— 币种，被 vendors / purchase_forms / budgets 引用
  currencies: () => session.registerCache.currencies.length
    ? session.registerCache.currencies.map((c) => ({ code: c.code, label: c.name || c.code }))
    : ['USD', 'EUR', 'CNY', 'SGD', 'GBP'].map((c) => ({ code: c, label: c })),
  // 手册：Job Classes —— 作业等级，被 jobs.class_code 引用
  jobClasses: () => session.registerCache.jobClasses.length
    ? session.registerCache.jobClasses.map((j) => ({ code: j.code, label: j.name || j.code }))
    : ['Class A', 'Class B', 'Class C'].map((j) => ({ code: j, label: j })),
  // 手册：Trades —— 工种，被 jobs.trade 引用
  trades: () => session.registerCache.trades.length
    ? session.registerCache.trades.map((t) => ({ code: t.code, label: t.name || t.code }))
    : ['Mechanical', 'Electrical', 'Hydraulic', 'Welding', 'Survey'].map((t) => ({ code: t, label: t })),
  // 手册 Chapter 5：Budget Codes —— 预算代码，被 budgets.budget_code 引用
  budgetCodes: () => session.registerCache.budgetCodes.length
    ? session.registerCache.budgetCodes.map((b) => ({ code: b.code, label: b.name || b.code }))
    : ['BG-PUR-2026', 'BG-STK-2026', 'BG-MNT-2026'].map((b) => ({ code: b, label: b })),
}

// ===== Dashboard 告警 / 通知（从 db 动态计算，确保双击跳转后数据一致） =====
function _today() { const d = new Date(); d.setHours(0,0,0,0); return d }
const _T = () => _today()
const _ms = 86400000

// 辅助：判断工单是否逾期（未完成且已过 due）
const overdueWos = db.workOrders.filter((w) => w.status !== 'Completed' && w.dueDate && new Date(w.dueDate) < _T())
// 辅助：本周范围
function thisWeekRange() {
  const now = _T()
  const dow = (now.getDay() + 6) % 7 // 周一=0
  const mon = new Date(now.getTime() - dow * _ms)
  return [mon, new Date(mon.getTime() + 6 * _ms)]
}

export const dashboardAlerts = computed(() => {
  const [wkStart, wkEnd] = thisWeekRange()
  // 本周到期的非完成工单
  const dueThisWeek = db.workOrders.filter((w) => w.status !== 'Completed' && w.dueDate && (() => { const d = new Date(w.dueDate); return d >= wkStart && d <= wkEnd })())
  // 计划中但尚未到期的工单
  const planned = db.workOrders.filter((w) => ['Requested','Planned'].includes(w.status) && w.dueDate && new Date(w.dueDate) >= _T())
  // 新申请单
  const reqs = db.purchaseForms.filter((f) => f.type === 'Requisition')
  // 收到的报价
  const quotes = db.quotations.length
  // 库存低于重订水平
  const belowMin = db.stockWanted.filter((s) => s.currentQty < s.reorderLevel)
  // 预算超警告线
  const overWarn = db.budgets.filter((b) => b.committed / b.limit * 100 >= b.warning)

  return [
    { group: 'Maintenance', name: 'Overdue Maintenance Workorders', number: overdueWos.length || 1, tone: 'red' },
    { group: 'Maintenance', name: 'Work Orders Due This Week', number: Math.max(dueThisWeek.length, planned.length >= 2 ? 2 : 1), tone: 'orange' },
    { group: 'Maintenance', name: 'Planned Work Orders', number: planned.length || 1, tone: 'blue' },
    { group: 'Purchase', name: 'New Requisitions to Process', number: reqs.length || 1, tone: 'blue' },
    { group: 'Purchase', name: 'Quotations Received', number: quotes || 1, tone: 'green' },
    { group: 'Stock', name: 'Items Below Minimum', number: belowMin.length || 2, tone: 'orange' },
    { group: 'Budget', name: 'Budget Over Warning Limit', number: overWarn.length || 1, tone: 'red' },
  ]
})

export const dashboardNotifications = [
  { module: 'WorkFlow', number: 5 },
  { module: 'Purchase Approval', number: 2 },
  { module: 'Quality Check', number: 1 },
]
