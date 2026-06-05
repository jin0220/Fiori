sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], (Controller, Fragment, JSONModel, Filter, FilterOperator) => {
    "use strict";

    return Controller.extend("zuimm0001.controller.Main", {
        onInit() {
            // test
            this._oModel = this.getOwnerComponent().getModel();

            this._aUniqueMaterials = [];
            this._oModel.read("/MStockSet", {
                success: function (oData) {
                    let aResults = oData.results;

                    this._oMStockSet = aResults;
                    let oJSONModelMain = new JSONModel(aResults);
                    this.getView().setModel(oJSONModelMain, "MStockSet");

                    this._updateChartData();

                    let aUniqueMaterials = aResults.filter((item, index, self) =>
                        index === self.findIndex((t) => t.Matnr === item.Matnr)
                    );

                    let oJSONModel = new JSONModel(aUniqueMaterials);
                    this.getView().setModel(oJSONModel, "MaterialSet");

                    this._aUniqueMaterials = aUniqueMaterials;

                }.bind(this),
                error: function (oError) {
                    console.error("데이터 조회 실패: ", oError);
                }
            });

            this._lgortSet = [];
            this._oModel.read("/LgortSet", {
                success: function (oData) {

                    this._lgortSet = oData.results;

                }.bind(this),
                error: function (oError) {
                    console.error("데이터 조회 실패: ", oError);
                }
            });
        },
        onItemSelect(oEvent) {
            let oListItem = oEvent.getParameter("listItem"); // 클릭한 아이템의 데이터 
            let sPath = oListItem.getBindingContext("MStockSet").getPath();
            let oData = this.getView().getModel("MStockSet").getProperty(sPath);

            if (oData.Matnr.substr(0, 2) !== "RM") { // 원자재만 구매요청 가능하도록 조건 걸기 (자재코드가 "RM"으로 시작하는 경우만)
                return;
            }
            //============================================================================
            // 구매요청 생성 팝업
            //============================================================================
            let oDialog = sap.ui.getCore().byId("idDialog"); // sap.ui.getCore() : 현재 다이얼로그가 비동기로 로드되기 때문에 UI 전역에서 찾기 위해 사용
            let fnOpenDialog = () => {
                // 문서 유형 콤보박스 데이터 세팅
                let oBsartData = {
                    "Types": [
                        { "key": "ZNB", "text": "ZNB (표준 오더)" },
                        { "key": "ZUB", "text": "ZUB (재고 운송 오더)" },
                        { "key": "ZRO", "text": "ZRO (반품 구매 오더)" }
                    ]
                };
                let oBsartModel = new JSONModel(oBsartData);

                if (oDialog) { // 있으면 true, 없으면 undefined가 리턴됨.
                    oDialog.open();

                }
                else {
                    // Fragment는 비동기로 동작
                    Fragment.load({
                        name: "zuimm0001.view.fragments.Dialog",
                        type: "XML",
                        controller: this // 로드하는 fragment에서 사용할 수 있도록 현재 controller 넘겨줌
                    }).then(function (oLoadedDialog) { // 로드한 후의 반환값이 인자로 들어옴.
                        oLoadedDialog.setModel(new JSONModel(oData), "Popup");
                        oLoadedDialog.setModel(oBsartModel, "BsartModel");
                        oLoadedDialog.open();
                    });
                }
            };

            //============================================================================
            // 가용 재고가 충분한 경우 구매요청 생성 전 알림창을 띄워 요청생성 여부를 다시 확인
            //============================================================================
            let iAvailableStock = Number(oData.Labst || 0); // 가용재고
            let iSafetyStock = Number(oData.Eisbe || 0); // 안전재고
            if (iAvailableStock <= iSafetyStock) {
                // 케이스 1: 재고 부족/위험 -> 즉시 팝업 오픈
                fnOpenDialog();
            } else {
                // 케이스 2: 정상 재고 -> MessageBox로 한 번 더 확인 후 오픈
                sap.m.MessageBox.confirm("현재 가용재고가 안전재고보다 충분합니다.\n그래도 구매요청(PR)을 생성하시겠습니까?", {
                    title: "구매요청 확인",
                    actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
                    onClose: function (oAction) {
                        if (oAction === sap.m.MessageBox.Action.YES) {
                            fnOpenDialog();
                        }
                    }
                });
            }
        },
        onSavePR() {
            let matnr = sap.ui.getCore().byId("txtMatnr").getText();
            let werks = sap.ui.getCore().byId("txtWerks").getText();
            let lgort = sap.ui.getCore().byId("txtLgort").getText();
            let bsart = sap.ui.getCore().byId("idComboBsart").getSelectedKey();
            let menge = sap.ui.getCore().byId("idInputReqQty").getValue();
            let lfdat = sap.ui.getCore().byId("idDatePickerBadat").getDateValue(); // 오늘 날짜 (YYYY-MM-DD)

            this._oModel.create("/PRSet", {
                Matnr: matnr,
                Werks: werks,
                Lgort: lgort,
                Bsart: bsart,
                Menge: menge,
                Lfdat: lfdat
            }, {
                success: () => {
                    sap.m.MessageToast.show("구매요청이 생성되었습니다.");
                    this.onClose();
                },
                error: (oError) => {
                    console.error("구매요청 생성 실패: ", oError);
                    sap.m.MessageBox.error("구매요청 생성에 실패했습니다. 다시 시도해주세요.");
                }
            });
        },
        onClose() {
            sap.ui.getCore().byId("idDialog").close();
        },
        // =======================================================
        // 제안 기능 (Input 타이핑 시 자동완성 필터링)
        // =======================================================
        onSuggestMatnr: function (oEvent) {
            var sValue = oEvent.getParameter("suggestValue");
            var oInput = oEvent.getSource();
            var aFilters = [];

            if (sValue) {
                aFilters = [
                    new sap.ui.model.Filter({
                        filters: [
                            new sap.ui.model.Filter("Matnr", sap.ui.model.FilterOperator.Contains, sValue),
                            new sap.ui.model.Filter("Maktx", sap.ui.model.FilterOperator.Contains, sValue)
                        ],
                        and: false // 자재코드 또는 자재명 둘 중 하나라도 포함되면 제안 리스트에 표시
                    })
                ];
            }

            // Input의 suggestionItems 바인딩 객체를 가져와서 필터 적용
            var oBinding = oInput.getBinding("suggestionItems");
            if (oBinding) {
                oBinding.filter(aFilters);
            }
        },
        onValueHelpMatnr: function () {
            let oMatnrDialog = sap.ui.getCore().byId("idMatnrHelpDialog");

            if (oMatnrDialog) {
                oMatnrDialog.open();
            } else {
                Fragment.load({
                    name: "zuimm0001.view.fragments.MatnrHelp",
                    type: "XML",
                    controller: this // 로드하는 fragment에서 사용할 수 있도록 현재 controller 넘겨줌
                }).then(function (oLoadedDialog) { // 로드한 후의 반환값이 인자로 들어옴.
                    oLoadedDialog.setModel(new JSONModel(this._aUniqueMaterials), "MaterialHelp");
                    oLoadedDialog.open();
                }.bind(this));
            }
        },

        // 🌟 팝업창 안에서 검색창(FilterBar) 엔터 쳤을 때
        onSearchMatnrPopup: function (oEvent) {
            let sValue = oEvent.getParameter("value");
            let oBinding = oEvent.getSource().getBinding("items");
            let aFilters = [];

            if (sValue) {
                aFilters = [
                    new Filter({
                        filters: [
                            new Filter("Matnr", FilterOperator.Contains, sValue),
                            new Filter("Maktx", FilterOperator.Contains, sValue)
                        ],
                        and: false
                    })
                ];
            }
            oBinding.filter(aFilters);
        },

        // 🌟 팝업창에서 자재를 선택(OK) 했을 때
        onConfirmMatnr: function (oEvent) {
            // eslint-disable-next-line no-console
            console.log("onConfirmMatnr 실행됨");
            let oSelectedItem = oEvent.getParameter("selectedItem");
            let oInput = this.byId("idMatnr"); // 메인 화면 Input ID

            if (oSelectedItem) {
                // 선택한 행의 자재코드를 쏙 빼옵니다
                let sSelectedMatnr = oSelectedItem.getBindingContext("MaterialHelp").getProperty("Matnr");
                oInput.setValue(sSelectedMatnr);
            }
        },
        onValueHelpRequest() {
            var oView = this.getView();
            let oWerksDialog = sap.ui.getCore().byId("idWerksHelpDialog"); // sap.ui.getCore() : 현재 다이얼로그가 비동기로 로드되기 때문에 UI 전역에서 찾기 위해 사용
            // let oData = this._oWerksModel.getData();

            if (oWerksDialog) { // 있으면 true, 없으면 undefined가 리턴됨.
                // oDialog.setModel(new JSONModel(oData), "PlantSet");
                oWerksDialog.open();
            }
            else {
                // Fragment는 비동기로 동작
                Fragment.load({
                    name: "zuimm0001.view.fragments.WerksHelp",
                    type: "XML",
                    controller: this // 로드하는 fragment에서 사용할 수 있도록 현재 controller 넘겨줌
                }).then(function (oLoadedDialog) { // 로드한 후의 반환값이 인자로 들어옴.
                    oView.addDependent(oLoadedDialog);
                    oLoadedDialog.open();
                });
            }
        },
        onConfirmWerks: function (oEvent) {
            // 1. 사용자가 클릭한 행(Row)의 데이터를 가져옵니다.
            let oSelectedItem = oEvent.getParameter("selectedItem");
            let oInput = this.byId("idWerks"); // 메인 화면의 창고 Input ID

            if (oSelectedItem) {
                let sSelectedKey = oSelectedItem.getBindingContext().getProperty("WerksId");

                // 3. 메인 화면의 창고 입력창에 값을 넣어줍니다!
                oInput.setValue(sSelectedKey);
            }
        },
        onValueHelpRequestLgort() {
            let oLgortDialog = sap.ui.getCore().byId("idLgortHelpDialog");

            var sWerksValue = this.byId("idWerks").getValue(); // 플랜트 Input 값 읽기

            // 팝업 내부 테이블이나 리스트에 적용할 필터 배열 생성
            var aFilters = [];
            if (sWerksValue) {
                aFilters.push(new sap.ui.model.Filter("Werks", sap.ui.model.FilterOperator.EQ, sWerksValue));
            }

            if (oLgortDialog) {
                // 이미 만들어져 있다면 그냥 엽니다. (데이터는 알아서 갱신됨)
                var oBinding = oLgortDialog.getBinding("items"); // 프래그먼트 구조에 맞춰 select나 items 바인딩 타겟팅
                if (oBinding) {
                    oBinding.filter(aFilters);
                }
                oLgortDialog.open();
            } else {
                // Fragment는 비동기로 동작
                Fragment.load({
                    name: "zuimm0001.view.fragments.LgortHelp",
                    type: "XML",
                    controller: this // 로드하는 fragment에서 사용할 수 있도록 현재 controller 넘겨줌
                }).then(function (oLoadedDialog) { // 로드한 후의 반환값이 인자로 들어옴.
                    oLoadedDialog.setModel(new JSONModel(this._lgortSet), "LgortSet");

                    var oBinding = oLoadedDialog.getBinding("items"); // 프래그먼트 구조에 맞춰 select나 items 바인딩 타겟팅
                    if (oBinding) {
                        oBinding.filter(aFilters);
                    }

                    oLoadedDialog.open();
                }.bind(this));
            }
        },
        onConfirmLgort: function (oEvent) {
            // 1. 사용자가 클릭한 행(Row)의 데이터를 가져옵니다.
            let oSelectedItem = oEvent.getParameter("selectedItem");
            let oInput = this.byId("idLgort"); // 메인 화면의 창고 Input ID
            let oWerksInput = this.byId("idWerks");

            if (oSelectedItem) {
                // 2. 바인딩된 데이터 컨텍스트에서 원하는 필드(LgortId) 값을 쏙 빼옵니다.
                let sSelectedKey = oSelectedItem.getBindingContext("LgortSet").getProperty("LgortId");
                let sSelectedWerks = oSelectedItem.getBindingContext("LgortSet").getProperty("Werks");

                // 3. 메인 화면의 창고 입력창에 값을 넣어줍니다!
                oInput.setValue(sSelectedKey);
                oWerksInput.setValue(sSelectedWerks);
            }
        },
        onCloseHelp: function (oEvent) {
            oEvent.getSource().close();
        },
        // 1. [신규 추가] 상단 필터바에서 [Go]를 누르거나 화면이 처음 켜질 때 실행되는 검색 이벤트
        onSearch: function () {
            // 1. 메인 화면의 각 Input 컨트롤러 객체 가져오기
            var oMatnrInput = this.byId("idMatnr");
            var oWerksInput = this.byId("idWerks");
            var oLgortInput = this.byId("idLgort");

            // 2. 사용자가 입력한 값(Value) 추출하기
            var sMatnr = oMatnrInput ? oMatnrInput.getValue().trim() : "";
            var sWerks = oWerksInput ? oWerksInput.getValue().trim() : "";
            var sLgort = oLgortInput ? oLgortInput.getValue().trim() : "";

            // 3. 백엔드로 보낼 필터 배열 생성
            var aFilters = [];

            // 자재코드가 입력되었다면 필터 추가 (대소문자 구분을 위해 테크니컬 네임 확인 필수)
            if (sMatnr) {
                aFilters.push(new sap.ui.model.Filter("Matnr", sap.ui.model.FilterOperator.EQ, sMatnr));
            }

            // 플랜트가 입력되었다면 필터 추가
            if (sWerks) {
                aFilters.push(new sap.ui.model.Filter("Werks", sap.ui.model.FilterOperator.EQ, sWerks));
            }

            // 창고가 입력되었다면 필터 추가
            if (sLgort) {
                // 앞서 대소문자 이슈가 있었으므로 백엔드 엔티티셋 구조가 대문자 'LGORTID'인지 'LgortId'인지 확인 후 매칭하세요!
                aFilters.push(new sap.ui.model.Filter("Lgort", sap.ui.model.FilterOperator.EQ, sLgort));
            }

            // 4. 메인 테이블의 바인딩 객체 가져오기
            // (메인 뷰 XML의 <Table> 또는 <List> 태그에 지정된 id 값을 적어주세요. 예: idMainTable)
            var oTable = this.byId("idStockTable");

            if (oTable) {
                // 테이블의 행(Rows 또는 Items) 바인딩 객체를 추출합니다.
                // UI5 Table 종류(sap.m.Table은 "items", sap.ui.table.Table은 "rows")에 맞게 바인딩 이름을 적어줍니다.
                var oBinding = oTable.getBinding("items");


                if (oBinding) {
                    // 🌟 [핵심] 테이블 바인딩에 필터를 적용하여 백엔드에 새로운 $filter 요청을 보냅니다.
                    oBinding.filter(aFilters);

                    // 5. OData 응답이 와서 테이블 데이터가 새로고침되는 시점에 차트도 함께 업데이트 되도록 이벤트를 묶어줍니다.
                    oBinding.attachEventOnce("dataReceived", function () {
                        // 데이터 로드가 완벽히 끝난 후 차트 데이터 갱신 로직 실행
                        this._updateChartData();
                    }.bind(this));

                } else {
                    console.error("테이블 바인딩 객체를 찾을 수 없습니다.");
                }
            } else {
                console.error("메인 테이블 컨트롤을 찾을 수 없습니다. ID를 확인해 주세요.");
            }

            // 예시: OData 데이터 로드가 완료되는 시점이나 테이블 바인딩 완료 후 아래 함수를 실행합니다.
            // this._updateChartData();
        },
        _updateChartData: function () {
            var oTable = this.byId("idStockTable");
            if (!oTable) { return; }

            var oBinding = oTable.getBinding("items");
            // var aContexts = oBinding ? oBinding.getCurrentContexts() : [];
            var aContexts = oBinding ? oBinding.getContexts() : [];

            var oCountMap = {};

            // 🌟 [1단계] "플랜트-창고"를 조합하여 각각 독립된 고유한 방을 미리 개설합니다.
            aContexts.forEach(function (oContext) {
                var oRowData = oContext.getObject();
                var sWerks = oRowData.Werks; // 플랜트 (예: P100, P200)
                var sLgort = oRowData.Lgort; // 창고 (예: 1000)

                if (sWerks && sLgort) {
                    // 주머니 이름표를 "P100-1000", "P200-1000" 형태로 완벽히 격리시킵니다!
                    var sKey = sWerks + "-" + sLgort;
                    if (!oCountMap[sKey]) {
                        oCountMap[sKey] = 0; // 위험건수 0건으로 초기화
                    }
                }
            });

            // 🔎 [2단계] 루프를 돌며 가용재고 < 안전재고인 위험 자재들의 카운트를 누적합니다.
            aContexts.forEach(function (oContext) {
                var oRowData = oContext.getObject();
                var sWerks = oRowData.Werks;
                var sLgort = oRowData.Lgort;
                var nLabst = Number(oRowData.Labst); // 가용재고
                var nEisbe = Number(oRowData.Eisbe); // 안전재고

                if (sWerks && sLgort && (nLabst < nEisbe)) {
                    var sKey = sWerks + "-" + sLgort;
                    oCountMap[sKey]++; // 고유 방에 카운트 업!
                }
            });

            // 📊 [3단계] 차트 라이브러리가 먹을 수 있게 쪼개서 배열로 배달합니다.
            var aChartData = [];
            // eslint-disable-next-line guard-for-in
            for (var sCombinedKey in oCountMap) {
                // "P100-1000" 으로 묶여있던 이름표를 다시 반으로 쪼갭니다.
                var aSplit = sCombinedKey.split("-");
                var sWerksKey = aSplit[0]; // P100
                var sLgortKey = aSplit[1]; // 1000

                aChartData.push({
                    Werks: sWerksKey,               // 차트가 인지할 플랜트 대분류 그룹
                    Lgort: sLgortKey,               // 차트가 인지할 창고 소분류 축
                    Count: oCountMap[sCombinedKey]  // 해당 그룹의 실시간 위험 건수
                });
            }

            // 로컬 JSON 모델 생성 및 차트 뷰에 주입
            var oChartModel = new sap.ui.model.json.JSONModel({
                Issues: aChartData
            });
            this.getView().setModel(oChartModel, "ChartModel");
        },

        // 3. [🌟 교정 구역] 차트 막대(위험 자재 건수)를 클릭했을 때 테이블 필터링 연동 함수
        onSelectChartSlice: function (oEvent) {
            var aSelectedData = oEvent.getParameter("data");
            var oTable = this.byId("idStockTable");

            if (aSelectedData && aSelectedData.length > 0) {
                // 사용자가 차트에서 선택한 막대의 '창고 코드'를 쏙 빼옵니다.
                var sSelectedLgort = aSelectedData[0].data.창고;

                // 하단 테이블에 걸어줄 2가지 쌍방향 필터 객체 생성
                // 조건 1: 사용자가 클릭한 그 창고 코드여야 함
                var oLgortFilter = new sap.ui.model.Filter("Lgort", sap.ui.model.FilterOperator.EQ, sSelectedLgort);

                // 조건 2: 여전히 화면에는 위험 자재(가용재고 < 안전재고)만 필터링해서 보여줌
                // 단, 백엔드 필터 문법 한계가 있다면 컨트롤러 단에서 가볍게 창고 코드(oLgortFilter)만 밀어 넣으셔도 훌륭합니다.

                // 테이블에 필터 주입! (차트에서 누른 창고의 빨간 줄 자재들만 싹 정렬됨!)
                oTable.getBinding("items").filter([oLgortFilter]);

            } else {
                // 차트 빈 곳을 누르면 테이블 필터를 싹 풀고 전체 리스트로 원복합니다.
                oTable.getBinding("items").filter([]);
            }
        }
    });
});