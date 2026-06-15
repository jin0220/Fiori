sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], (Controller, Fragment, JSONModel, Filter, FilterOperator) => {
    "use strict";

    return Controller.extend("zuimm0002.controller.Detail", {
        onInit() {
            let oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteDetail").attachPatternMatched(this._onObjectMatched, this);

            this._oModel = this.getOwnerComponent().getModel();

            var oQuickViewModel = new JSONModel({});
            this.getView().setModel(oQuickViewModel, "quickViewModel");
        },

        _onObjectMatched(oEvent) {
            // 1. 메인 화면에서 선택해 넘어온 PR 번호 낚아채기
            let sBanfn = oEvent.getParameters().arguments.banfn;
            let sBnfpo = oEvent.getParameters().arguments.bnfpo;

            this.getView().setModel(new JSONModel({ lanes: [], nodes: [] }), "ProcessModel");

            // 🌟 2. 껍데기만 있던 화면에 데이터를 주입하는 함수를 드디어 호출합니다!
            this._renderProcessFlow(sBanfn, sBnfpo);
        },

        _renderProcessFlow(sBanfn, sBnfpo) {
            // 1. Lanes 구조 정의 (상단 카테고리 축)
            let aLanes = [
                { id: "lanePR", icon: "sap-icon://request", text: "구매요청 (PR)", position: 0 },
                { id: "lanePO", icon: "sap-icon://cart", text: "구매오더 (PO)", position: 1 },
                { id: "laneGR", icon: "sap-icon://shipping-status", text: "자재문서 (GR)", position: 2 },
                { id: "laneIV", icon: "sap-icon://accounting-document-verification", text: "송장문서 (IV)", position: 3 }
            ];

            // 2. Nodes 구조 정의 (실제 전달받은 sBanfn 변수를 첫 카드 타이틀에 동적 매핑!)
            let aNodes = [];

            this._oModel.read("/PRSet(Banfn='" + sBanfn + "',Bnfpo='" + sBnfpo + "')", {
                urlParameters: {
                    "$expand": "POSet/GRSet/IVSet"
                },
                success: function (oData) {
                    this.byId("panelTitle").setText(oData.Matnr + " [" + oData.Maktx + "]");

                    let POSet = (oData.POSet && oData.POSet.results && oData.POSet.results[0]) || null;
                    let GRSet = (POSet && POSet.GRSet && POSet.GRSet.results && POSet.GRSet.results[0]) || null;
                    let IVSet = (GRSet && GRSet.IVSet && GRSet.IVSet.results && GRSet.IVSet.results[0]) || null;

                    this._oRawDetailData = oData;

                    // --- 1단계: PR 상태 제어 (항상 존재함) ---
                    let sStatus = "Neutral";
                    let sText = "대기";
                    if (oData.Statu === 'A' || oData.Statu === 'C') { sStatus = "Positive"; sText = "승인"; }
                    else if (oData.Statu === 'W') { sStatus = "Critical"; sText = "결재 대기"; }
                    else if (oData.Statu === 'R') { sStatus = "Negative"; sText = "반려"; }

                    // --- 2단계: PO 상태 제어 (POSet 존재 여부 체크) ---
                    let pStatus = "Neutral";
                    let pText = "진행 전";
                    let pTitle = "PO 대기";
                    let pVendor = "-";

                    if (POSet) {
                        pTitle = POSet.Ebeln;
                        pVendor = POSet.Name1 || "-";
                        if (POSet.ZgrStatu === 'C') {
                            pStatus = "Positive";
                            pText = "발주 완료";
                        } else if ((oData.Statu === 'A' || oData.Statu === 'C') && POSet.ZgrStatu === 'A') {
                            pStatus = "Critical";
                            pText = "발주 대기";
                        }
                    }

                    // --- 3단계: GR 상태 제어 (GRSet 및 부모인 POSet 존재 여부 체크) ---
                    let gStatus = "Neutral";
                    let gText = "진행 전";
                    let gTitle = "GR 대기";

                    if (GRSet && POSet) {
                        gTitle = GRSet.Mblnr;
                        if (POSet.Elikz === 'X') {
                            gStatus = "Positive";
                            gText = "창고 적재 완료";
                        } else if (POSet.Elikz === '' && POSet.ZgrStatu === 'C') {
                            gStatus = "Critical";
                            gText = "입고 대기";
                        }
                    }

                    // --- 4단계: IV 상태 제어 (IVSet 존재 여부 체크) ---
                    let iStatus = "Neutral";
                    let iText = "진행 전";
                    let iTitle = "IV 대기";

                    if (IVSet && POSet) {
                        iTitle = IVSet.Mblnr;
                        if (IVSet.Statu === 'K') {
                            iStatus = "Positive";
                            iText = "송장 정산 마감";
                        } else if (IVSet.Statu !== 'K' && POSet.Elikz === 'X') {
                            iStatus = "Critical";
                            iText = "송장 정산 대기";
                        }
                    }
                    aNodes.push({
                        id: "1",
                        lane: "lanePR",
                        title: oData.Banfn,
                        titleAbbr: "PR",
                        state: sStatus,
                        children: ["2"],
                        texts: [
                            "상태: " + sText
                        ]
                    }, {
                        id: "2",
                        lane: "lanePO",
                        title: pTitle,
                        titleAbbr: "PO",
                        state: pStatus,
                        children: ["3"],
                        texts: [
                            "상태: " + pText,
                            "Vendor: " + pVendor
                            // ,
                            // "단가: " + POSet.Brtwr + " " + POSet.Waers
                        ]
                    }, {
                        id: "3",
                        lane: "laneGR",
                        title: gTitle,
                        titleAbbr: "GR",
                        state: gStatus,
                        children: ["4"],
                        texts: ["상태: " + gText]
                    }, {
                        id: "4",
                        lane: "laneIV",
                        title: iTitle,
                        titleAbbr: "IV",
                        state: iStatus,
                        children: [],
                        texts: ["상태: " + iText]
                    });

                    // 3. 모델 주입
                    let oProcessModel = new JSONModel({
                        lanes: aLanes,
                        nodes: aNodes
                    });
                    this.getView().setModel(oProcessModel, "ProcessModel");
                }.bind(this),
                error: function (oError) {
                    console.error("OData 읽기 실패: ", oError);
                }
            });
        },
        onNodePress: function (oEvent) {
            var oView = this.getView();
            var oParameters = oEvent.getParameters();

            var oPRData = this._oRawDetailData;

            // 1. 클릭된 노드 ID 추출
            var sNodeId = oEvent.getParameters().getProperty("nodeId");

            // 2. 메인 ProcessModel에서 전체 노드 배열 안전하게 가져오기
            var oProcessModel = oView.getModel("ProcessModel");
            var aNodes = [];
            if (oProcessModel) {
                aNodes = oProcessModel.getData().nodes || oProcessModel.getProperty("/nodes") || [];
            }

            // 3. ID 매칭으로 클릭한 카드의 데이터 탐색
            var oTargetData = aNodes.find(function (node) {
                return node && String(node.id).trim() === String(sNodeId).trim();
            });

            // 4. [핵심] 방법 A: UI 스위치 및 데이터 객체 조립
            // 기본 구조 정의
            var oDisplayData = {
                titleAbbr: "",
                title: "",
                statusText: "",
                isPR: false,
                isPO: false,
                isGR: false,
                isIV: false,
                vendorName: "",
                poCondition: "",
                lgort: "",
                ivMethod: ""
            };

            if (oTargetData) {
                var sLane = oTargetData.lane; // "lanePR", "lanePO", "laneGR", "laneIV"

                // 공통 데이터 바인딩
                oDisplayData.titleAbbr = oTargetData.titleAbbr || "-";
                oDisplayData.title = oTargetData.title || "-";
                oDisplayData.statusText = oTargetData.texts ? oTargetData.texts[0].replace("상태: ", "") : "-";

                var oDateTimeInstance = sap.ui.core.format.DateFormat.getDateTimeInstance({
                    pattern: "yyyy-MM-dd"
                });

                var oPOData = (oPRData.POSet && oPRData.POSet.results && oPRData.POSet.results[0]) || null;
                var oGRData = (oPOData && oPOData.GRSet && oPOData.GRSet.results && oPOData.GRSet.results[0]) || null;
                var oIVData = (oGRData && oGRData.IVSet && oGRData.IVSet.results && oGRData.IVSet.results[0]) || null;

                // Lane별 분기 제어 및 전용 필드 활성화
                if (sLane === "lanePR") {
                    oDisplayData.isPR = true;
                    oDisplayData.Werks = oPRData.Werks || "-";
                    oDisplayData.Lgort = oPRData.Lgort || "-";

                    if (oPRData.Badat) {
                        var oDate = oPRData.Badat instanceof Date ? oPRData.Badat : new Date(oPRData.Badat);

                        oDisplayData.Badat = oDateTimeInstance.format(oDate);
                    } else {
                        oDisplayData.Badat = "-";
                    }

                } else if (sLane === "lanePO") {
                    oDisplayData.isPO = true;
                    var oPOData = (oPRData.POSet && oPRData.POSet.results && oPRData.POSet.results[0]) || null;
                    if (oPOData) {
                        oDisplayData.vendorName = oTargetData.texts && oTargetData.texts[1] ? oTargetData.texts[1].replace("Vendor: ", "") : "-";
                        oDisplayData.Menge = (oPOData.Menge || "0") + " " + (oPOData.Meins || "");

                        var oKrwFormatter = sap.ui.core.format.NumberFormat.getFloatInstance({
                            maxFractionDigits: 0, // 원화는 소수점이 불필요하므로 무조건 제거
                            groupingEnabled: true // 천단위 콤마 활성화
                        });

                        if (oPOData.Waers == "KRW") {
                            oDisplayData.Brtwr = oPOData.Brtwr * 100 + " " + oPOData.Waers;
                        }

                        if (oPOData.Erdat) {
                            var oDate = oPOData.Erdat instanceof Date ? oPOData.Erdat : new Date(oPOData.Erdat);

                            oDisplayData.Erdat = oDateTimeInstance.format(oDate);
                        } else {
                            oDisplayData.Erdat = "-";
                        }
                    } else {
                        oDisplayData.vendorName = "-";
                        oDisplayData.Menge = "-";
                        oDisplayData.Brtwr = "-";
                        oDisplayData.Erdat = "-";
                    }

                } else if (sLane === "laneGR") {
                    oDisplayData.isGR = true;

                    var oGRData = (oPOData && oPOData.GRSet && oPOData.GRSet.results && oPOData.GRSet.results[0]) || null;
                    console.log(oGRData);
                    if (oGRData) {
                        var oDate = oGRData.Budat instanceof Date ? oGRData.Budat : new Date(oGRData.Budat);

                        oDisplayData.Budat = oDateTimeInstance.format(oDate);
                        oDisplayData.Werks = oGRData.Werks;
                        oDisplayData.lgort = oGRData.Lgort + "번 " + oGRData.Lgpla;
                        oDisplayData.Menge = oGRData.Menge + " " + oGRData.Meins;
                    } else {
                        oDisplayData.Budat = "-";
                        oDisplayData.Werks = "-";
                        oDisplayData.lgort = "-";
                        oDisplayData.Menge = "-";
                    }

                } else if (sLane === "laneIV") {
                    oDisplayData.isIV = true; 
                    var oIVData = (oGRData && oGRData.IVSet && oGRData.IVSet.results && oGRData.IVSet.results[0]) || null;
                    console.log(oIVData);
                    if (oIVData && oPOData) {
                        var oDate = oIVData.Budat instanceof Date ? oIVData.Budat : new Date(oIVData.Budat);

                        oDisplayData.Budat = oDateTimeInstance.format(oDate);
                        oDisplayData.Lifnr = oPOData.Name1;
                        oDisplayData.Werks = oIVData.Werks;

                        if (oIVData.Waers == "KRW") {
                            oDisplayData.Rmwwr = oIVData.Rmwwr * 100 + " " + oIVData.Waers;
                        } else {
                            oDisplayData.Rmwwr = oIVData.Rmwwr + " " + oIVData.Waers;
                        }

                        if (oIVData.Sgtxt) {
                            oDisplayData.Sgtxt = oIVData.Sgtxt;
                        } else {
                            oDisplayData.Sgtxt = "-";
                        }
                    }
                    else {
                        oDisplayData.Budat = "-";
                        oDisplayData.Lifnr = "-";
                        oDisplayData.Werks = "-";
                        oDisplayData.Rmwwr = "-";
                        oDisplayData.Sgtxt = "-";
                    }
                }
            } else {
                // 방어 코드
                oDisplayData.title = "ID " + sNodeId;
                oDisplayData.statusText = "데이터 읽기 실패";
            }

            // 5. 정돈된 데이터를 quickViewModel 모델에 통째로 꽂아넣기
            oView.getModel("quickViewModel").setData(oDisplayData);

            // 6. Dialog 팝업 열기 (안전한 정중앙 오픈)
            if (!this._pDialog) {
                this._pDialog = Fragment.load({
                    id: oView.getId(),
                    name: "zuimm0002.view.fragments.QuickView",
                    controller: this
                }).then(function (oDialog) {
                    oView.addDependent(oDialog);
                    return oDialog;
                });
            }

            this._pDialog.then(function (oDialog) {
                oDialog.open();
            });
        },

        // 다이얼로그 닫기 함수
        onCloseDialog: function () {
            if (this._pDialog) {
                this._pDialog.then(function (oDialog) {
                    oDialog.close();
                });
            }
        },
    });
});