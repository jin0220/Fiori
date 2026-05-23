sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel"
], (Controller, Fragment, JSONModel) => {
    "use strict";

    return Controller.extend("zuimm0001.controller.Main", {
        onInit() {
            this._oModel = this.getOwnerComponent().getModel();
        },
        // 🌟 [최종 해결책] 화면이 100% 다 그려진 직후 자동으로 실행되는 천하무적 타이밍 함수
        onAfterRendering: function() {
            var oTable = this.byId("idStockTable");
            
            // 테이블이 화면에 장착 완료되었으므로, 안전하게 items 파이프라인을 낚아챕니다.
            var oBinding = oTable.getBinding("items");
            
            if (oBinding) {
                // 이미 데이터가 있다면 즉시 차트를 그리고,
                this._updateChartData();
                
                // 혹시 비동기로 데이터가 늦게 도착할 상황을 대비해 안전하게 센서를 한 번 더 달아둡니다.
                oBinding.attachEvent("change", function() {
                    this._updateChartData();
                }.bind(this));
            }
        },
        onItemSelect(oEvent) {
            let oListItem = oEvent.getParameter("listItem"); // 클릭한 아이템의 데이터 
            let sPath = oListItem.getBindingContext().getPath();
            let oData = this._oModel.getProperty(sPath);

            let oDialog = sap.ui.getCore().byId("idDialog"); // sap.ui.getCore() : 현재 다이얼로그가 비동기로 로드되기 때문에 UI 전역에서 찾기 위해 사용

            if (oDialog) { // 있으면 true, 없으면 undefined가 리턴됨.
                oDialog.setModel(new JSONModel(oData), "Popup");
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
                    oLoadedDialog.open();
                });
            }
        },
        onClose() {
            sap.ui.getCore().byId("idDialog").close();
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
            var oView = this.getView();
            let oLgortDialog = sap.ui.getCore().byId("idLgortHelpDialog");

            if (oLgortDialog) {
                // 이미 만들어져 있다면 그냥 엽니다. (데이터는 알아서 갱신됨)
                oLgortDialog.open();
            } else {
                // Fragment는 비동기로 동작
                Fragment.load({
                    name: "zuimm0001.view.fragments.LgortHelp",
                    type: "XML",
                    controller: this // 로드하는 fragment에서 사용할 수 있도록 현재 controller 넘겨줌
                }).then(function (oLoadedDialog) { // 로드한 후의 반환값이 인자로 들어옴.
                    oView.addDependent(oLoadedDialog);
                    oLoadedDialog.open();
                });
            }
        },
        onConfirmLgort: function (oEvent) {
            // 1. 사용자가 클릭한 행(Row)의 데이터를 가져옵니다.
            let oSelectedItem = oEvent.getParameter("selectedItem");
            let oInput = this.byId("idLgort"); // 메인 화면의 창고 Input ID

            if (oSelectedItem) {
                // 2. 바인딩된 데이터 컨텍스트에서 원하는 필드(LgortId) 값을 쏙 빼옵니다.
                let sSelectedKey = oSelectedItem.getBindingContext().getProperty("LgortId");

                // 3. 메인 화면의 창고 입력창에 값을 넣어줍니다!
                oInput.setValue(sSelectedKey);
            }
        },
        onCloseHelp: function (oEvent) {
            oEvent.getSource().close();
        },
        // 1. [신규 추가] 상단 필터바에서 [Go]를 누르거나 화면이 처음 켜질 때 실행되는 검색 이벤트
        onSearch: function () {
            // 기존에 질문자님이 짜두신 조회 로직(OData 호출 또는 필터바 작동 코드)을 여기에 실행한 뒤,
            // 백엔드에서 데이터를 다 읽어오면 아래 차트 연산 함수를 호출해 줍니다.
            
            // 예시: OData 데이터 로드가 완료되는 시점이나 테이블 바인딩 완료 후 아래 함수를 실행합니다.
            this._updateChartData();
        },
        _updateChartData: function () {
            var oTable = this.byId("idStockTable");
            if (!oTable) { return; }

            var oBinding = oTable.getBinding("items");
            var aContexts = oBinding ? oBinding.getCurrentContexts() : []; 
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